var express = require('express');
var router = express.Router();
var NguoiChoi = require('../models/nguoichoi');
var DoiTuyen = require('../models/doituyen');
var auth = require('../middlewares/auth');
var nhatKyHeThong = require('../services/nhatkyhethong');
var thongBaoHeThong = require('../services/thongbao');

function layVaiTro(req) {
    return (req.session && (req.session.VaiTro || req.session.QuyenHan)) || 'khach';
}

router.get('/', auth.yeuCauDangNhap, async function (req, res) {
    var ds = await NguoiChoi.find().populate('DoiTuyen').sort({ HoVaTen: 1 }).exec();

    var nguoichoiCaNhan = ds.filter(function (item) {
        return !item.DoiTuyen;
    });

    var nguoichoiTheoDoi = ds.filter(function (item) {
        return !!item.DoiTuyen;
    });

    var vaiTro = layVaiTro(req);

    res.render('nguoichoi', {
        title: 'Người chơi',
        nguoichoiCaNhan: nguoichoiCaNhan,
        nguoichoiTheoDoi: nguoichoiTheoDoi,
        canManage: vaiTro === 'admin' || vaiTro === 'nhanvien',
        isAdmin: vaiTro === 'admin'
    });
});

router.get('/them', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    var doituyen = await DoiTuyen.find({ KichHoat: true }).sort({ TenDoi: 1 }).lean().exec();
    res.render('nguoichoi_them', {
        title: 'Thêm người chơi',
        doituyen: doituyen
    });
});

router.post('/them', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    try {
        var data = {
            HoVaTen: req.body.HoVaTen,
            NickName: req.body.NickName,
            Email: req.body.Email,
            SoDienThoai: req.body.SoDienThoai,
            Rank: req.body.Rank,
            HinhAnh: req.body.HinhAnh,
            DoiTuyen: req.body.DoiTuyen || null,
            GhiChu: req.body.GhiChu,
            KichHoat: req.body.KichHoat ? true : false
        };

        var nguoiChoiMoi = await NguoiChoi.create(data);

        await nhatKyHeThong.ghiNhatKy(req, {
            hanhDong: 'Thêm người chơi',
            doiTuong: nguoiChoiMoi.HoVaTen,
            chiTiet: 'Người chơi mới đã được tạo.',
            duLieuMoi: nguoiChoiMoi.toObject(),
            mucDo: 'Thong tin'
        });

        await thongBaoHeThong.taoThongBaoHeThong({
            tieuDe: 'Thêm người chơi mới',
            noiDung: nguoiChoiMoi.HoVaTen + ' (' + nguoiChoiMoi.NickName + ') vừa được tạo.',
            loaiThongBao: 'Khac',
            mucDo: 'Thong tin'
        });

        req.session.success = 'Đã thêm người chơi thành công.';
        return res.redirect('/nguoichoi');
    } catch (err) {
        console.log(err);
        req.session.error = 'Không thể thêm người chơi.';
        return res.redirect('/nguoichoi/them');
    }
});

router.get('/sua/:id', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    var nc = await NguoiChoi.findById(req.params.id).exec();
    if (!nc) {
        req.session.error = 'Không tìm thấy người chơi.';
        return res.redirect('/nguoichoi');
    }

    var doituyen = await DoiTuyen.find({ KichHoat: true }).sort({ TenDoi: 1 }).lean().exec();
    res.render('nguoichoi_sua', {
        title: 'Sửa người chơi',
        nguoichoi: nc,
        doituyen: doituyen
    });
});

router.post('/sua/:id', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    try {
        var id = req.params.id;
        var nguoiChoiCu = await NguoiChoi.findById(id).exec();
        if (!nguoiChoiCu) {
            req.session.error = 'Không tìm thấy người chơi.';
            return res.redirect('/nguoichoi');
        }

        var data = {
            HoVaTen: req.body.HoVaTen,
            NickName: req.body.NickName,
            Email: req.body.Email,
            SoDienThoai: req.body.SoDienThoai,
            Rank: req.body.Rank,
            HinhAnh: req.body.HinhAnh,
            DoiTuyen: req.body.DoiTuyen || null,
            GhiChu: req.body.GhiChu,
            KichHoat: req.body.KichHoat ? true : false
        };

        await NguoiChoi.findByIdAndUpdate(id, data).exec();

        await nhatKyHeThong.ghiNhatKy(req, {
            hanhDong: 'Cập nhật người chơi',
            doiTuong: data.HoVaTen,
            chiTiet: 'Thông tin người chơi đã được cập nhật.',
            duLieuCu: nguoiChoiCu.toObject(),
            duLieuMoi: data,
            mucDo: 'Thong tin'
        });

        await thongBaoHeThong.taoThongBaoHeThong({
            tieuDe: 'Cập nhật người chơi',
            noiDung: data.HoVaTen + ' vừa được cập nhật thông tin.',
            loaiThongBao: 'Khac',
            mucDo: 'Thong tin'
        });

        req.session.success = 'Đã cập nhật người chơi thành công.';
        return res.redirect('/nguoichoi');
    } catch (err) {
        console.log(err);
        req.session.error = 'Không thể cập nhật người chơi.';
        return res.redirect('/nguoichoi/sua/' + req.params.id);
    }
});

router.get('/xoa/:id', auth.yeuCauAdmin, async function (req, res) {
    try {
        var nguoiChoi = await NguoiChoi.findById(req.params.id).exec();
        await NguoiChoi.findByIdAndDelete(req.params.id).exec();

        await nhatKyHeThong.ghiNhatKy(req, {
            hanhDong: 'Xóa người chơi',
            doiTuong: nguoiChoi ? nguoiChoi.HoVaTen : req.params.id,
            chiTiet: 'Người chơi đã bị xóa khỏi hệ thống.',
            duLieuCu: nguoiChoi ? nguoiChoi.toObject() : null,
            mucDo: 'Quan trong'
        });

        req.session.success = 'Đã xóa người chơi thành công.';
        return res.redirect('/nguoichoi');
    } catch (err) {
        console.log(err);
        req.session.error = 'Không thể xóa người chơi.';
        return res.redirect('/nguoichoi');
    }
});

module.exports = router;
