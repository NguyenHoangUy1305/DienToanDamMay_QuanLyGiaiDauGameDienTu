var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');
var TaiKhoan = require('../models/taikhoan');

// Lấy URI từ index.js
var uri = process.env.MONGO_URI || 'mongodb://13hoanguy_db_user:123@ac-63dmeyd-shard-00-00.b8ir9xx.mongodb.net:27017/qlgiaidaugame?ssl=true&authSource=admin';

mongoose.connect(uri)
    .then(async () => {
        console.log('Đang kết nối để thiết lập lại Database...');
        
        // Drop toàn bộ Database
        await mongoose.connection.db.dropDatabase();
        console.log('Đã Drop Database thành công!');

        // Tạo lại Tài khoản Admin
        var salt = bcrypt.genSaltSync(10);
        var hash = bcrypt.hashSync('123456', salt);

        await TaiKhoan.create({
            HoVaTen: 'Nguyen Hoang Uy',
            TenDangNhap: 'admin',
            MatKhau: hash,
            Email: 'admin@gmail.com',
            VaiTro: 'admin',
            QuyenHan: 'admin',
            KichHoat: true
        });

        console.log('Đã tạo tài khoản admin thành công mật khẩu: 123456');
        process.exit();
    })
    .catch(err => {
        console.log('Lỗi:', err);
        process.exit();
    });
