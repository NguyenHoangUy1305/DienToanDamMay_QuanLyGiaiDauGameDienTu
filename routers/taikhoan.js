var express = require('express');
var router = express.Router();
var bcrypt = require('bcryptjs');
var TaiKhoan = require('../models/taikhoan');
var auth = require('../middlewares/auth');
var nhatKyHeThong = require('../services/nhatkyhethong');
var NguoiChoi = require('../models/nguoichoi');

function roleOf(acc) {
    return (acc && (acc.QuyenHan || acc.VaiTro) ? (acc.QuyenHan || acc.VaiTro) : 'nguoi_choi').toString().toLowerCase();
}

function isInternalRole(role) {
    return role === 'admin' || role === 'nhanvien';
}

router.get('/', auth.yeuCauAdmin, async function (req, res) {
    try {
        var ds = await TaiKhoan.find().sort({ createdAt: -1 }).lean().exec();

        var admins = ds.filter(function (x) { return roleOf(x) === 'admin'; });
        var nhanviens = ds.filter(function (x) { return roleOf(x) === 'nhanvien'; });
        var nguoichois = ds.filter(function (x) { return roleOf(x) === 'nguoi_choi'; });

        res.render('taikhoan_list', {
            title: 'Quản lý tài khoản',
            admins: admins,
            nhanviens: nhanviens,
            nguoichois: nguoichois,
            session: req.session,
            currentUserId: req.session && req.session.MaNguoiDung ? req.session.MaNguoiDung.toString() : ''
        });
    } catch (err) {
        req.session.error = 'Không thể tải danh sách tài khoản.';
        res.redirect('/');
    }
});

router.post('/them-noibo', auth.yeuCauAdmin, async function (req, res) {
    try {
        var role = (req.body.QuyenHan || '').toString().toLowerCase().trim();
        if (!isInternalRole(role)) {
            req.session.error = 'Chỉ được tạo tài khoản admin hoặc nhân viên ở mục này.';
            return res.redirect('/taikhoan');
        }

        var tenDangNhap = (req.body.TenDangNhap || '').trim();
        var matKhau = (req.body.MatKhau || '').trim();
        var hoVaTen = (req.body.HoVaTen || '').trim();

        if (!tenDangNhap || !matKhau || !hoVaTen) {
            req.session.error = 'Vui lòng nhập đủ họ tên, tên đăng nhập và mật khẩu.';
            return res.redirect('/taikhoan');
        }

        var existed = await TaiKhoan.findOne({ TenDangNhap: tenDangNhap }).lean().exec();
        if (existed) {
            req.session.error = 'Tên đăng nhập đã tồn tại.';
            return res.redirect('/taikhoan');
        }

        var salt = bcrypt.genSaltSync(10);
        var created = await TaiKhoan.create({
            HoVaTen: hoVaTen,
            Email: (req.body.Email || '').trim(),
            TenDangNhap: tenDangNhap,
            MatKhau: bcrypt.hashSync(matKhau, salt),
            QuyenHan: role,
            VaiTro: role,
            KichHoat: true
        });

        await nhatKyHeThong.ghiNhatKy(req, {
            hanhDong: 'Tạo tài khoản nội bộ',
            doiTuong: created.TenDangNhap,
            chiTiet: 'Admin tạo tài khoản ' + role + ' cho ' + created.HoVaTen,
            mucDo: 'Quan trọng'
        });

        req.session.success = 'Đã tạo tài khoản ' + role + ' thành công.';
        return res.redirect('/taikhoan');
    } catch (err) {
        req.session.error = err && err.message ? err.message : 'Không thể tạo tài khoản nội bộ.';
        return res.redirect('/taikhoan');
    }
});

router.post('/sua-noibo/:id', auth.yeuCauAdmin, async function (req, res) {
    try {
        var id = req.params.id;
        var acc = await TaiKhoan.findById(id).exec();
        if (!acc) {
            req.session.error = 'Không tìm thấy tài khoản cần sửa.';
            return res.redirect('/taikhoan');
        }

        var role = roleOf(acc);
        if (!isInternalRole(role)) {
            req.session.error = 'Chỉ sửa tài khoản admin/nhân viên ở mục này.';
            return res.redirect('/taikhoan');
        }

        acc.HoVaTen = (req.body.HoVaTen || acc.HoVaTen || '').trim();
        acc.Email = (req.body.Email || '').trim();
        acc.KichHoat = req.body.KichHoat === '1';

        var matKhauMoi = (req.body.MatKhauMoi || '').trim();
        if (matKhauMoi) {
            var salt = bcrypt.genSaltSync(10);
            acc.MatKhau = bcrypt.hashSync(matKhauMoi, salt);
        }

        await acc.save();

        await nhatKyHeThong.ghiNhatKy(req, {
            hanhDong: 'Sửa tài khoản nội bộ',
            doiTuong: acc.TenDangNhap,
            chiTiet: 'Admin cập nhật thông tin tài khoản ' + acc.TenDangNhap,
            mucDo: 'Quan trọng'
        });

        req.session.success = 'Đã cập nhật tài khoản nội bộ.';
        return res.redirect('/taikhoan');
    } catch (err) {
        req.session.error = err && err.message ? err.message : 'Không thể cập nhật tài khoản.';
        return res.redirect('/taikhoan');
    }
});

router.post('/xoa-noibo/:id', auth.yeuCauAdmin, async function (req, res) {
    try {
        var id = req.params.id;
        var currentUserId = req.session && req.session.MaNguoiDung ? req.session.MaNguoiDung.toString() : '';

        if (id.toString() === currentUserId) {
            req.session.error = 'Admin không được xóa chính tài khoản của mình.';
            return res.redirect('/taikhoan');
        }

        var acc = await TaiKhoan.findById(id).exec();
        if (!acc) {
            req.session.error = 'Không tìm thấy tài khoản cần xóa.';
            return res.redirect('/taikhoan');
        }

        var role = roleOf(acc);
        if (!isInternalRole(role)) {
            req.session.error = 'Chỉ xóa tài khoản admin/nhân viên ở mục này.';
            return res.redirect('/taikhoan');
        }

        await TaiKhoan.deleteOne({ _id: id }).exec();

        await nhatKyHeThong.ghiNhatKy(req, {
            hanhDong: 'Xóa tài khoản nội bộ',
            doiTuong: acc.TenDangNhap,
            chiTiet: 'Admin đã xóa tài khoản ' + acc.TenDangNhap,
            mucDo: 'Quan trọng'
        });

        req.session.success = 'Đã xóa tài khoản nội bộ.';
        return res.redirect('/taikhoan');
    } catch (err) {
        req.session.error = err && err.message ? err.message : 'Không thể xóa tài khoản.';
        return res.redirect('/taikhoan');
    }
});

router.post('/duyet/:id', auth.yeuCauAdmin, async function (req, res) {
    try {
        var id = req.params.id;
        var acc = await TaiKhoan.findById(id).exec();
        if (!acc) throw new Error('Không tìm thấy tài khoản.');

        if (roleOf(acc) !== 'nguoi_choi') {
            req.session.error = 'Chức năng duyệt chỉ áp dụng cho tài khoản người chơi.';
            return res.redirect('/taikhoan');
        }

        acc.KichHoat = true;
        await acc.save();

        await NguoiChoi.updateMany({ TaiKhoan: acc._id }, { $set: { KichHoat: true } }).exec();

        await nhatKyHeThong.ghiNhatKy(req, {
            hanhDong: 'Duyệt tài khoản người chơi',
            doiTuong: acc.TenDangNhap,
            chiTiet: 'Admin đã kích hoạt tài khoản người chơi ' + acc.TenDangNhap,
            mucDo: 'Quan trọng'
        });

        req.session.success = 'Đã duyệt và kích hoạt tài khoản người chơi.';
        res.redirect('/taikhoan');
    } catch (err) {
        req.session.error = err.message;
        res.redirect('/taikhoan');
    }
});

router.post('/role/:id', auth.yeuCauAdmin, function (req, res) {
    req.session.error = 'Chức năng sửa quyền đã tắt để đảm bảo đúng nghiệp vụ.';
    return res.redirect('/taikhoan');
});

module.exports = router;
