var express = require('express');
var router = express.Router();
var DoiTuyen = require('../models/doituyen');
var auth = require('../middlewares/auth');
var nhatKyHeThong = require('../services/nhatkyhethong');
var thongBaoHeThong = require('../services/thongbao');

function layVaiTro(req) {
    return (req.session && (req.session.VaiTro || req.session.QuyenHan)) || 'khach';
}

// GET: Danh sách đội tuyển
router.get('/', auth.yeuCauDangNhap, async function (req, res) {
    var dt = await DoiTuyen.find().sort({ TenDoi: 1 }).exec();
    var vaiTro = layVaiTro(req);

    res.render('doituyen', {
        title: 'Đội tuyển',
        doituyen: dt,
        canManage: vaiTro === 'admin' || vaiTro === 'nhanvien',
        isAdmin: vaiTro === 'admin'
    });
});

// GET: Thêm đội tuyển
router.get('/them', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    res.render('doituyen_them', {
        title: 'Thêm đội tuyển'
    });
});

// POST: Thêm đội tuyển
router.post('/them', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    try {
        var data = {
            TenDoi: req.body.TenDoi,
            TruongDoi: req.body.TruongDoi,
            SoDienThoai: req.body.SoDienThoai,
            Email: req.body.Email,
            GhiChu: req.body.GhiChu,
            KichHoat: req.body.KichHoat ? true : false
        };

        var doiTuyenMoi = await DoiTuyen.create(data);
        await nhatKyHeThong.ghiNhatKy(req, {
            hanhDong: 'Thêm đội tuyển',
            doiTuong: doiTuyenMoi.TenDoi,
            chiTiet: (doiTuyenMoi.TruongDoi || 'Đội mới') + ' đã được thêm vào hệ thống.',
            duLieuMoi: doiTuyenMoi.toObject(),
            mucDo: 'Thong tin'
        });
        await thongBaoHeThong.taoThongBaoHeThong({
            tieuDe: 'Thêm đội tuyển mới',
            noiDung: doiTuyenMoi.TenDoi + ' vừa được thêm vào danh sách đội tuyển.',
            loaiThongBao: 'Khac',
            mucDo: 'Thong tin'
        });

        req.session.success = 'Đã thêm đội tuyển thành công.';
        return res.redirect('/doituyen');
    }
    catch (err) {
        console.log(err);
        req.session.error = 'Không thể thêm đội tuyển.';
        return res.redirect('/doituyen/them');
    }
});

// GET: Sửa đội tuyển
router.get('/sua/:id', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    var id = req.params.id;
    var dt = await DoiTuyen.findById(id).exec();

    if (!dt) {
        req.session.error = 'Không tìm thấy đội tuyển.';
        return res.redirect('/doituyen');
    }

    res.render('doituyen_sua', {
        title: 'Sửa đội tuyển',
        doituyen: dt
    });
});

// POST: Sửa đội tuyển
router.post('/sua/:id', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    try {
        var id = req.params.id;
        var doiTuyenCu = await DoiTuyen.findById(id).exec();
        var data = {
            TenDoi: req.body.TenDoi,
            TruongDoi: req.body.TruongDoi,
            SoDienThoai: req.body.SoDienThoai,
            Email: req.body.Email,
            GhiChu: req.body.GhiChu,
            KichHoat: req.body.KichHoat ? true : false
        };

        await DoiTuyen.findByIdAndUpdate(id, data).exec();
        await nhatKyHeThong.ghiNhatKy(req, {
            hanhDong: 'Cập nhật đội tuyển',
            doiTuong: data.TenDoi,
            chiTiet: 'Thông tin đội tuyển đã được chỉnh sửa.',
            duLieuCu: doiTuyenCu ? doiTuyenCu.toObject() : null,
            duLieuMoi: data,
            mucDo: 'Thong tin'
        });
        await thongBaoHeThong.taoThongBaoHeThong({
            tieuDe: 'Cập nhật đội tuyển',
            noiDung: data.TenDoi + ' vừa được cập nhật thông tin.',
            loaiThongBao: 'Khac',
            mucDo: 'Thong tin'
        });

        req.session.success = 'Đã cập nhật đội tuyển thành công.';
        return res.redirect('/doituyen');
    }
    catch (err) {
        console.log(err);
        req.session.error = 'Không thể cập nhật đội tuyển.';
        return res.redirect('/doituyen/sua/' + req.params.id);
    }
});

// GET: Xóa đội tuyển
router.get('/xoa/:id', auth.yeuCauAdmin, async function (req, res) {
    try {
        var id = req.params.id;
        var doiTuyen = await DoiTuyen.findById(id).exec();
        await DoiTuyen.findByIdAndDelete(id).exec();
        await nhatKyHeThong.ghiNhatKy(req, {
            hanhDong: 'Xóa đội tuyển',
            doiTuong: doiTuyen ? doiTuyen.TenDoi : id,
            chiTiet: 'Đội tuyển đã bị xóa khỏi hệ thống.',
            duLieuCu: doiTuyen ? doiTuyen.toObject() : null,
            mucDo: 'Quan trong'
        });
        await thongBaoHeThong.taoThongBaoHeThong({
            tieuDe: 'Xóa đội tuyển',
            noiDung: 'Một đội tuyển vừa bị xóa khỏi hệ thống.',
            loaiThongBao: 'Khac',
            mucDo: 'Canh bao'
        });

        req.session.success = 'Đã xóa đội tuyển thành công.';
        return res.redirect('/doituyen');
    }
    catch (err) {
        console.log(err);
        req.session.error = 'Không thể xóa đội tuyển.';
        return res.redirect('/doituyen');
    }
});

module.exports = router;
