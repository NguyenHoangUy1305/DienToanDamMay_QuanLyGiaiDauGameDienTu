var express = require('express');
var router = express.Router();
var bcrypt = require('bcryptjs');
var TaiKhoan = require('../models/taikhoan');
var NguoiChoi = require('../models/nguoichoi');
var nhatKyHeThong = require('../services/nhatkyhethong');
var thongBaoHeThong = require('../services/thongbao');

// GET: Dang ky
router.get('/dangky', async (req, res) => {
    var message = req.session && req.session.error ? '<div class="alert alert-danger">' + req.session.error + '</div>' : '';
    if (req.session && req.session.success) message = '<div class="alert alert-success">' + req.session.success + '</div>';
    req.session.error = null;
    req.session.success = null;
    res.render('dangky', { title: 'Đăng ký tài khoản', message: message });
});

// POST: Dang ky
router.post('/dangky', async (req, res) => {
    var kiemTra = await TaiKhoan.findOne({ TenDangNhap: req.body.TenDangNhap }).exec();
    if (kiemTra) {
        req.session.error = 'Tên đăng nhập đã tồn tại.';
        return res.redirect('/dangky');
    }

    var salt = bcrypt.genSaltSync(10);
    var taiKhoanMoi = await TaiKhoan.create({
        HoVaTen: req.body.HoVaTen,
        Email: req.body.Email,
        TenDangNhap: req.body.TenDangNhap,
        MatKhau: bcrypt.hashSync(req.body.MatKhau, salt),
        QuyenHan: 'nguoi_choi',
        KichHoat: true
    });

    await NguoiChoi.create({
        HoVaTen: req.body.HoVaTen,
        NickName: req.body.NickName || '',
        Email: req.body.Email || '',
        SoDienThoai: req.body.SoDienThoai || '',
        TaiKhoan: taiKhoanMoi._id,
        KichHoat: true
    });

    req.session.success = 'Đăng ký thành công! Bạn có thể đăng nhập ngay.';
    res.redirect('/dangnhap');
});

// GET: Dang nhap nguoi choi
router.get('/dangnhap', async (req, res) => {
    var message = req.session && req.session.error ? '<div class="alert alert-danger">' + req.session.error + '</div>' : '';
    if (req.session && req.session.success) message = '<div class="alert alert-success">' + req.session.success + '</div>';
    req.session.error = null;
    req.session.success = null;
    res.render('dangnhap', { title: 'Đăng nhập', message: message });
});

// POST: Dang nhap nguoi choi
router.post('/dangnhap', async (req, res) => {
    var taikhoan = await TaiKhoan.findOne({ TenDangNhap: req.body.TenDangNhap }).exec();
    if (taikhoan && bcrypt.compareSync(req.body.MatKhau, taikhoan.MatKhau)) {
        if (taikhoan.QuyenHan === 'admin' || taikhoan.QuyenHan === 'nhanvien') {
            req.session.error = 'Admin/Nhân viên vui lòng dùng cổng sau (Ctrl+Shift+A).';
            return res.redirect('/dangnhap');
        }
        if (taikhoan.KichHoat == 0) {
            req.session.error = 'Tài khoản chưa được duyệt hoặc bị khóa.';
            return res.redirect('/dangnhap');
        }

        req.session.MaNguoiDung = taikhoan._id;
        req.session.VaiTro = taikhoan.QuyenHan;
        req.session.HoVaTen = taikhoan.HoVaTen;
        req.session.QuyenHan = taikhoan.QuyenHan;

        await thongBaoHeThong.taoThongBaoHeThong({
            tieuDe: 'Người dùng đăng nhập',
            noiDung: taikhoan.HoVaTen + ' vừa đăng nhập vào hệ thống.',
            loaiThongBao: 'HeThong',
            mucDo: 'Thong tin',
            nguoiGui: taikhoan._id
        });

        await nhatKyHeThong.ghiNhatKy(req, {
            hanhDong: 'Đăng nhập',
            doiTuong: taikhoan.TenDangNhap,
            chiTiet: taikhoan.HoVaTen + ' đăng nhập hệ thống.',
            mucDo: 'Thong tin'
        });

        return res.redirect('/');
    }

    req.session.error = 'Sai tài khoản hoặc mật khẩu.';
    return res.redirect('/dangnhap');
});

// GET: Dang nhap admin/staff
router.get('/dangnhap_admin', async (req, res) => {
    var message = req.session && req.session.error ? '<div class="alert alert-danger">' + req.session.error + '</div>' : '';
    req.session.error = null;
    res.render('dangnhap_admin', { title: 'Cổng quản trị', message: message });
});

// POST: Dang nhap admin/staff
router.post('/dangnhap_admin', async (req, res) => {
    var taikhoan = await TaiKhoan.findOne({ TenDangNhap: req.body.TenDangNhap }).exec();
    if (taikhoan && bcrypt.compareSync(req.body.MatKhau, taikhoan.MatKhau)) {
        if (taikhoan.QuyenHan === 'nguoi_choi') {
            req.session.error = 'Người chơi không được vào cổng quản trị!';
            return res.redirect('/dangnhap_admin');
        }
        if (taikhoan.KichHoat == 0) {
            req.session.error = 'Tài khoản đã bị khóa.';
            return res.redirect('/dangnhap_admin');
        }

        req.session.MaNguoiDung = taikhoan._id;
        req.session.VaiTro = taikhoan.QuyenHan;
        req.session.HoVaTen = taikhoan.HoVaTen;
        req.session.QuyenHan = taikhoan.QuyenHan;

        await thongBaoHeThong.taoThongBaoHeThong({
            tieuDe: 'Quản trị đăng nhập',
            noiDung: taikhoan.HoVaTen + ' đăng nhập cổng quản trị.',
            loaiThongBao: 'HeThong',
            mucDo: 'Thong tin',
            nguoiGui: taikhoan._id
        });

        await nhatKyHeThong.ghiNhatKy(req, {
            hanhDong: 'Đăng nhập quản trị',
            doiTuong: taikhoan.TenDangNhap,
            chiTiet: taikhoan.HoVaTen + ' đăng nhập cổng quản trị.',
            mucDo: 'Quan trong'
        });

        return res.redirect('/giaidau');
    }

    req.session.error = 'Sai tài khoản hoặc mật khẩu quản trị.';
    return res.redirect('/dangnhap_admin');
});

router.get('/dangxuat', async (req, res) => {
    try {
        var ten = req.session && req.session.HoVaTen ? req.session.HoVaTen : 'Người dùng';
        var uid = req.session && req.session.MaNguoiDung ? req.session.MaNguoiDung : null;

        await thongBaoHeThong.taoThongBaoHeThong({
            tieuDe: 'Người dùng đăng xuất',
            noiDung: ten + ' đã đăng xuất khỏi hệ thống.',
            loaiThongBao: 'HeThong',
            mucDo: 'Thong tin',
            nguoiGui: uid
        });

        await nhatKyHeThong.ghiNhatKy(req, {
            hanhDong: 'Đăng xuất',
            doiTuong: ten,
            chiTiet: ten + ' đã đăng xuất khỏi hệ thống.',
            mucDo: 'Thong tin'
        });
    } catch (e) {
        // bo qua loi ghi log de khong chan dang xuat
    }

    req.session.destroy(() => res.redirect('/'));
});

router.get('/error', (req, res) => {
    var message = req.session && req.session.error ? req.session.error : 'Có lỗi xảy ra.';
    req.session.error = null;
    res.render('error', { title: 'Lỗi', message: message });
});

router.get('/success', (req, res) => {
    var message = req.session && req.session.success ? req.session.success : 'Thành công.';
    req.session.success = null;
    res.render('success', { title: 'Thành công', message: message });
});

module.exports = router;
