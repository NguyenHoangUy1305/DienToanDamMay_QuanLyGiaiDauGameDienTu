// Load các biến môi trường từ file .env (giúp bảo mật mật khẩu, link database...)
require('dotenv').config(); 

// Khai báo các thư viện cần thiết cho dự án
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');

// Khởi tạo ứng dụng Express (trái tim của server)
const app = express();

// Đường dẫn kết nối đến Database MongoDB trên Cloud
const uri = process.env.MONGODB_URI || 'mongodb://13hoanguy_db_user:123@ac-63dmeyd-shard-00-00.b8ir9xx.mongodb.net:27017/qlgiaigame?ssl=true&authSource=admin';

// Kết nối với Database
mongoose.connect(uri)
    .then(() => console.log('Da ket noi MongoDB.'))
    .catch((err) => {
        console.error('Loi ket noi MongoDB:', err);
    });

// Cài đặt thư mục chứa giao diện (views) và View Engine (dùng EJS để render HTML)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Cài đặt thư mục 'public' để chứa các file tĩnh (CSS, JS, Hình ảnh...)
app.use(express.static(path.join(__dirname, 'public')));

// Cho phép server đọc được dữ liệu do người dùng gửi lên từ Form (POST request)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Cấu hình Session: Giúp ghi nhớ trạng thái đăng nhập của người dùng
app.use(session({
    secret: process.env.SESSION_SECRET || 'FCOnline-Secret-Key', // Chìa khóa mã hóa session
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7 // Thời gian sống của phiên đăng nhập (7 ngày)
    }
}));

// =========================================================================
// MIDDLEWARE TOÀN CỤC (GLOBAL MIDDLEWARE)
// Đoạn code này sẽ chạy TRƯỚC MỖI LẦN người dùng chuyển trang
// Nhiệm vụ: Phân quyền, kiểm tra đăng nhập và hiển thị thông báo lỗi/thành công
// =========================================================================
app.use((req, res, next) => {
    // 1. Kiểm tra vai trò của người dùng (nếu chưa đăng nhập thì là 'khach')
    const role = req.session ? (req.session.VaiTro || req.session.QuyenHan || 'khach') : 'khach';

    // 2. Nạp các biến này vào 'res.locals' để tất cả các file giao diện (.ejs) đều gọi ra xài được
    res.locals.session = req.session;
    res.locals.isLoggedIn = !!(req.session && req.session.MaNguoiDung);
    res.locals.role = role;
    res.locals.vaiTro = role;
    res.locals.isAdmin = role === 'admin';
    res.locals.isStaff = role === 'nhanvien';
    res.locals.canManage = role === 'admin' || role === 'nhanvien';

    // 3. Lấy các thông báo (Flash messages) được gửi từ các chức năng trước đó
    const err = req.session ? req.session.error : null;
    const success = req.session ? req.session.success : null;
    const googleCalendarLink = req.session ? req.session.googleCalendarLink : null;

    // 4. Xóa thông báo khỏi session ngay sau khi lấy, để tránh bị hiển thị lại ở lần load trang tiếp theo
    if (req.session) {
        delete req.session.error;
        delete req.session.success;
        delete req.session.googleCalendarLink;
    }

    // 5. Đóng gói thông báo thành thẻ div HTML để in ra màn hình
    if (err) {
        res.locals.message = '<div class="alert alert-danger">' + err + '</div>';
    } else if (success) {
        res.locals.message = '<div class="alert alert-success">' + success + '</div>';
    } else {
        res.locals.message = '';
    }

    res.locals.googleCalendarLink = googleCalendarLink || '';
    
    // Bắt buộc phải có next() để Express đi tiếp xuống phần khai báo Router bên dưới
    next();
});

// ĐÃ DỌN SẠCH ĐOẠN CODE GÂY TRẮNG MÀN HÌNH Ở ĐÂY!
// BÂY GIỜ LUỒNG CHẠY SẼ THÔNG SUỐT THẲNG XUỐNG DƯỚI:

// =========================================================================
// KHAI BÁO CÁC ĐƯỜNG DẪN ROUTER (CHIA NHỎ TỪNG TÍNH NĂNG)
// =========================================================================
app.use('/', require('./routers/auth'));                // Đăng nhập, đăng ký
app.use('/', require('./routers/index'));               // Trang chủ
app.use('/admin', require('./routers/admin'));          // Trang tổng quan của Admin
app.use('/taikhoan', require('./routers/taikhoan'));    // Quản lý tài khoản
app.use('/giaidau', require('./routers/giaidau'));      // Quản lý giải đấu
app.use('/trandau', require('./routers/trandau'));      // Quản lý trận đấu
app.use('/nguoichoi', require('./routers/nguoichoi'));  // Quản lý danh sách người chơi
app.use('/dangkygiaidau', require('./routers/dangkygiaidau')); // Nộp/duyệt đơn tham gia
app.use('/bangxephang', require('./routers/bangxephang'));     // Bảng xếp hạng (BXH)
app.use('/doituyen', require('./routers/doituyen'));          // Quản lý đội tuyển (Team)
app.use('/nhatkyhethong', require('./routers/nhatkyhethong')); // Lịch sử hoạt động (Log)
app.use('/thongbao', require('./routers/thongbao'));          // Hệ thống thông báo
app.use('/gcal', require('./routers/gcal'));                  // Xử lý API Lịch Google

// Đường dẫn kiểm tra tình trạng server (Health check)
app.get('/health', (req, res) => res.send('OK'));

// BẪY LỖI 404 (Không tìm thấy trang): 
// Nếu người dùng nhập URL tào lao không khớp với bất kỳ router nào ở trên, nó sẽ nhảy vào đây
app.use((req, res) => {
    res.status(404).render('error', {
        title: 'Loi',
        message: 'Khong tim thay trang',
        error: {}
    });
});

// Mở cổng (Port) để khởi động Server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log('Server chay tai http://127.0.0.1:' + port);
});

// Xuất app ra để các module khác (hoặc file chạy chính) có thể sử dụng
module.exports = app;