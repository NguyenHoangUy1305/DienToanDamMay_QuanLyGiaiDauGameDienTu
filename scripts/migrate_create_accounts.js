const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const SET_INACTIVE = false; // created accounts will be inactive (require admin approval) -> KichHoat: false

const uri = process.env.MONGODB_URI || 'mongodb://13hoanguy_db_user:123@ac-63dmeyd-shard-00-00.b8ir9xx.mongodb.net:27017/qlgiaigame?ssl=true&authSource=admin';

function normalizeUsername(s) {
  if (!s) return '';
  // remove diacritics and non-alphanum
  s = s.toString().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  s = s.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  if (s.length === 0) return 'user';
  return s.slice(0, 16);
}

(async () => {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const TaiKhoan = require('../models/taikhoan');
    const NguoiChoi = require('../models/nguoichoi');

    const profiles = await NguoiChoi.find({ $or: [{ TaiKhoan: null }, { TaiKhoan: { $exists: false } }] }).lean().exec();
    console.log('Profiles without account:', profiles.length);

    const candidates = profiles.filter(p => p.Email && p.Email.toString().trim().length > 0);
    console.log('  With email (candidates to create accounts):', candidates.length);

    const sample = [];
    for (const p of candidates.slice(0, 50)) {
      const local = p.Email.split('@')[0] || p.NickName || p.HoVaTen || 'user';
      const base = normalizeUsername(local);
      sample.push({ profileId: p._id.toString(), HoVaTen: p.HoVaTen, Email: p.Email, usernameBase: base });
    }

    console.log('\nSample candidate usernames (first 50):');
    sample.forEach(s => console.log(' ', s.profileId, s.HoVaTen, '->', s.usernameBase));

    if (!APPLY) {
      console.log('\nDry-run complete. To create accounts run: node scripts/migrate_create_accounts.js --apply');
      process.exit(0);
    }

    console.log('\nApplying: creating accounts for candidates...');
    let created = 0;
    for (const p of candidates) {
      try {
        // propose username from email local-part
        let base = normalizeUsername((p.Email || '').split('@')[0] || p.NickName || p.HoVaTen || 'user');
        let username = base;
        let suffix = 0;
        while (await TaiKhoan.findOne({ TenDangNhap: username }).lean().exec()) {
          suffix++;
          username = base + suffix;
        }

        const passwordPlain = crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || 'Pass1234';
        const salt = bcrypt.genSaltSync(10);
        const hashed = bcrypt.hashSync(passwordPlain, salt);

        const accountData = {
          HoVaTen: p.HoVaTen || p.NickName || username,
          Email: p.Email || '',
          TenDangNhap: username,
          MatKhau: hashed,
          QuyenHan: 'nguoi_choi',
          KichHoat: SET_INACTIVE
        };

        const newAcc = await TaiKhoan.create(accountData);
        await NguoiChoi.updateOne({ _id: p._id }, { $set: { TaiKhoan: newAcc._id, KichHoat: SET_INACTIVE } }).exec();

        console.log('  Created account', newAcc._id.toString(), 'TenDangNhap=', username, 'for profile', p._id.toString());
        console.log('    temp-password:', passwordPlain);
        created++;
      } catch (e) {
        console.error('  Failed to create account for profile', p._id.toString(), e.message || e);
      }
    }

    console.log('\nDone. Accounts created:', created);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
