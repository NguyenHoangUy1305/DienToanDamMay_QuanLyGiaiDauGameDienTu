var express = require('express');
var router = express.Router();
var TaiKhoan = require('../models/taikhoan');
var auth = require('../middlewares/auth');
var nhatKyHeThong = require('../services/nhatkyhethong');
var NguoiChoi = require('../models/nguoichoi');

// CHI ADMIN DUOC QUAN LY TAI KHOAN
router.get('/', auth.yeuCauAdmin, async function (req, res) {
    try {
        var ds = await TaiKhoan.find().sort({ createdAt: -1 }).lean().exec();
        res.render('taikhoan_list', {
            title: 'Quản lý tài khoản',
            taikhoan: ds,
            session: req.session,
            isAdmin: true,
            canManage: true
        });
    } catch (err) {
        res.redirect('/');
    }
});

// DUYET / KICH HOAT TAI KHOAN
router.post('/duyet/:id', auth.yeuCauAdmin, async function (req, res) {
    try {
        var id = req.params.id;
        var acc = await TaiKhoan.findById(id).exec();
        if (!acc) throw new Error('Không tìm thấy tài khoản.');

        acc.KichHoat = true;
        await acc.save();

        await NguoiChoi.updateMany({ TaiKhoan: acc._id }, { $set: { KichHoat: true } }).exec();

        await nhatKyHeThong.ghiNhatKy(req, {
            hanhDong: 'Duyệt tài khoản',
            doiTuong: acc.TenDangNhap,
            chiTiet: `Admin ${req.session.HoVaTen} đã kích hoạt tài khoản ${acc.TenDangNhap}`,
            mucDo: 'Quan trọng'
        });

        req.session.success = 'Đã duyệt và kích hoạt tài khoản thành công.';
        res.redirect('/taikhoan');
    } catch (err) {
        req.session.error = err.message;
        res.redirect('/taikhoan');
    }
});

// KHOA SUA QUYEN DE TRANH DOI ROLE LINH TINH
router.post('/role/:id', auth.yeuCauAdmin, async function (req, res) {
    req.session.error = 'Chức năng sửa quyền đã tắt để đảm bảo đúng nghiệp vụ.';
    return res.redirect('/taikhoan');
});

module.exports = router;
