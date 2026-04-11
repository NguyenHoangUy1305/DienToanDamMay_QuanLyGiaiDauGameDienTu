const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const TaiKhoan = require('../models/taikhoan');

// Use env MONGO_URI if provided, otherwise fallback to the same default used elsewhere
const uri = process.env.MONGO_URI || 'mongodb://13hoanguy_db_user:123@ac-63dmeyd-shard-00-00.b8ir9xx.mongodb.net:27017/qlgiaigame?ssl=true&authSource=admin';

(async () => {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const existing = await TaiKhoan.findOne({ TenDangNhap: 'admin' }).exec();
    if (existing) {
      console.log('Admin already exists:', existing._id.toString());
      process.exit(0);
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('123456', salt);

    const admin = await TaiKhoan.create({
      HoVaTen: 'Admin',
      TenDangNhap: 'admin',
      MatKhau: hash,
      Email: 'admin@example.com',
      VaiTro: 'admin',
      QuyenHan: 'admin',
      KichHoat: true
    });

    console.log('Created admin account. Username: admin Password: 123456 ID:', admin._id.toString());
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err);
    process.exit(1);
  }
})();
