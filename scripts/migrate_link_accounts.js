const mongoose = require('mongoose');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const SYNC_ACTIVATION = args.includes('--sync-activation');

const uri = process.env.MONGODB_URI || 'mongodb://13hoanguy_db_user:123@ac-63dmeyd-shard-00-00.b8ir9xx.mongodb.net:27017/qlgiaigame?ssl=true&authSource=admin';

(async () => {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const TaiKhoan = require('../models/taikhoan');
    const NguoiChoi = require('../models/nguoichoi');

    console.log('\nMode:', APPLY ? 'APPLY' : 'DRY-RUN');

    const accounts = await TaiKhoan.find().lean().exec();
    const accountsByEmail = {};
    accounts.forEach(a => {
      if (a.Email) {
        const key = a.Email.toString().trim().toLowerCase();
        accountsByEmail[key] = accountsByEmail[key] || [];
        accountsByEmail[key].push(a);
      }
    });

    const profiles = await NguoiChoi.find({ $or: [{ TaiKhoan: null }, { TaiKhoan: { $exists: false } }] }).lean().exec();

    const matches = [];
    const ambiguous = [];
    const unmatched = [];

    function qualifiesAsPlayerAccount(acc) {
      const q = (acc.QuyenHan || acc.VaiTro || '').toString().toLowerCase();
      return q === 'nguoi_choi' || q === 'khach' || q === '' || q === 'undefined' || !q;
    }

    for (const p of profiles) {
      const email = p.Email ? p.Email.toString().trim().toLowerCase() : null;
      if (!email) {
        unmatched.push({ profile: p, reason: 'no-email' });
        continue;
      }
      const candidates = accountsByEmail[email] || [];
      const filtered = candidates.filter(qualifiesAsPlayerAccount);
      if (filtered.length === 1) {
        matches.push({ profile: p, account: filtered[0] });
      } else if (filtered.length > 1) {
        ambiguous.push({ profile: p, accounts: filtered });
      } else {
        unmatched.push({ profile: p, reason: 'no-candidate' });
      }
    }

    const accountIdsWithProfile = await NguoiChoi.distinct('TaiKhoan', { TaiKhoan: { $ne: null } }).exec();
    const accountIdsWithProfileSet = new Set((accountIdsWithProfile || []).map(id => id.toString()));
    const accountsWithoutProfile = accounts.filter(a => !accountIdsWithProfileSet.has((a._id || '').toString()));

    console.log('\nSummary:');
    console.log('  Profiles without account:', profiles.length);
    console.log('    - Candidate unique matches:', matches.length);
    console.log('    - Ambiguous matches:', ambiguous.length);
    console.log('    - Unmatched profiles:', unmatched.length);
    console.log('  Accounts total:', accounts.length);
    console.log('  Accounts without profile:', accountsWithoutProfile.length);

    if (!APPLY) {
      console.log('\nSample matches (up to 50):');
      matches.slice(0, 50).forEach(m => console.log('  Link profile', m.profile._id.toString(), m.profile.HoVaTen, '-> account', m.account._id.toString(), m.account.TenDangNhap, m.account.Email));

      if (ambiguous.length) {
        console.log('\nAmbiguous examples:');
        ambiguous.slice(0, 20).forEach(a => console.log('  Profile', a.profile._id.toString(), a.profile.HoVaTen, 'candidates:', a.accounts.map(x => x._id.toString() + '(' + x.TenDangNhap + ')').join(', ')));
      }

      if (unmatched.length) {
        console.log('\nUnmatched profiles examples:');
        unmatched.slice(0, 20).forEach(u => console.log('  Profile', u.profile._id.toString(), u.profile.HoVaTen, 'reason:', u.reason));
      }

      if (accountsWithoutProfile.length) {
        console.log('\nAccounts without profile samples:');
        accountsWithoutProfile.slice(0, 20).forEach(a => console.log('  Account', a._id.toString(), a.TenDangNhap, a.Email, a.QuyenHan));
      }

      console.log('\nDry-run complete. To apply these links run: node scripts/migrate_link_accounts.js --apply');
      process.exit(0);
    }

    console.log('\nApplying links...');
    let applied = 0;
    for (const m of matches) {
      try {
        const res = await NguoiChoi.updateOne({ _id: m.profile._id }, { $set: { TaiKhoan: m.account._id } }).exec();
        applied++;
        console.log('  Linked', m.profile._id.toString(), '=>', m.account._id.toString());
        if (SYNC_ACTIVATION) {
          try {
            await NguoiChoi.updateOne({ _id: m.profile._id }, { $set: { KichHoat: !!m.account.KichHoat } }).exec();
            console.log('    Synced KichHoat to', !!m.account.KichHoat);
          } catch (e) {
            console.log('    Failed to sync KichHoat:', e.message || e);
          }
        }
      } catch (e) {
        console.error('  Failed to link', m.profile._id.toString(), e.message || e);
      }
    }

    console.log('\nApply complete. Total linked:', applied);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
