const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb://13hoanguy_db_user:123@ac-63dmeyd-shard-00-00.b8ir9xx.mongodb.net:27017/qlgiaigame?ssl=true&authSource=admin';

(async () => {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const TaiKhoan = require('../models/taikhoan');
    const NguoiChoi = require('../models/nguoichoi');

    const totalAccounts = await TaiKhoan.countDocuments();
    const adminAccounts = await TaiKhoan.countDocuments({ QuyenHan: 'admin' });
    const staffAccounts = await TaiKhoan.countDocuments({ QuyenHan: 'nhanvien' });
    const inactiveAccounts = await TaiKhoan.countDocuments({ KichHoat: false });

    console.log('\nAccounts summary:');
    console.log('  Total accounts:', totalAccounts);
    console.log('  Admin accounts:', adminAccounts);
    console.log('  Staff accounts:', staffAccounts);
    console.log('  Inactive accounts:', inactiveAccounts);

    // accounts without linked player profile
    const accounts = await TaiKhoan.find().select('_id TenDangNhap QuyenHan KichHoat').lean().exec();
    const accountsWithoutProfile = [];
    for (const a of accounts) {
      const linked = await NguoiChoi.findOne({ TaiKhoan: a._id }).lean().exec();
      if (!linked) accountsWithoutProfile.push(a);
    }

    console.log('\nAccounts without linked player profile:', accountsWithoutProfile.length);
    if (accountsWithoutProfile.length > 0) {
      accountsWithoutProfile.slice(0, 20).forEach(a => console.log('  -', a._id.toString(), a.TenDangNhap, a.QuyenHan, a.KichHoat));
    }

    // players without account
    const playersNoAccount = await NguoiChoi.find({ $or: [{ TaiKhoan: null }, { TaiKhoan: { $exists: false } }] }).select('_id HoVaTen Email DoiTuyen KichHoat').lean().exec();
    console.log('\nPlayer profiles without linked account:', playersNoAccount.length);
    if (playersNoAccount.length > 0) {
      playersNoAccount.slice(0, 20).forEach(p => console.log('  -', p._id.toString(), p.HoVaTen, p.Email, 'KichHoat=', p.KichHoat));
    }

    // players whose TaiKhoan references missing account
    const playersWithAccount = await NguoiChoi.find({ TaiKhoan: { $ne: null } }).select('_id HoVaTen TaiKhoan').lean().exec();
    const danglingPlayers = [];
    for (const p of playersWithAccount) {
      const acc = await TaiKhoan.findById(p.TaiKhoan).lean().exec();
      if (!acc) danglingPlayers.push(p);
    }
    console.log('\nPlayer profiles referencing missing accounts:', danglingPlayers.length);
    if (danglingPlayers.length > 0) {
      danglingPlayers.slice(0, 20).forEach(p => console.log('  -', p._id.toString(), p.HoVaTen, 'TaiKhoan=', p.TaiKhoan));
    }

    console.log('\nDone.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
