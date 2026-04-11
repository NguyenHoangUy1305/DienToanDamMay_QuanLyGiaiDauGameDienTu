var express = require('express');
var router = express.Router();
var GiaiDau = require('../models/giaidau');
var auth = require('../middlewares/auth');
var nhatKyHeThong = require('../services/nhatkyhethong');
var thongBaoHeThong = require('../services/thongbao');

function normalizeText(value) {
    return (value || '')
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

function isTeamTournament(theThuc) {
    return theThuc === 'TEAM';
}

function layVaiTro(req) {
    return (req.session && (req.session.VaiTro || req.session.QuyenHan)) || 'khach';
}

function toVietnameseTournamentType(theThuc) {
    if (theThuc === '1vs1') return '1 vs 1';
    if (theThuc === 'TEAM') return 'Đội';
    return theThuc || '';
}

function toVietnameseTournamentStatus(status) {
    switch (status) {
        case 'PENDING': return 'Sắp diễn ra';
        case 'ONGOING': return 'Đang diễn ra';
        case 'COMPLETED': return 'Đã kết thúc';
        case 'CANCELLED': return 'Đã hủy';
        default: return 'Không xác định';
    }
}

router.get('/', auth.yeuCauDangNhap, async function (req, res) {
    var gd = await GiaiDau.find().sort({ NgayBatDau: -1 }).lean().exec();

    var giai1vs1 = gd.filter(function (item) {
        return !isTeamTournament(item.TheThuc);
    });

    var giaiDoi = gd.filter(function (item) {
        return isTeamTournament(item.TheThuc);
    });

    var vaiTro = layVaiTro(req);

    res.render('giaidau', {
        title: 'Giải đấu',
        giaidau1vs1: giai1vs1,
        giaidauDoi: giaiDoi,
        canManage: vaiTro === 'admin' || vaiTro === 'nhanvien',
        isAdmin: vaiTro === 'admin',
        toVietnameseTournamentType: toVietnameseTournamentType,
        toVietnameseTournamentStatus: toVietnameseTournamentStatus
    });
});

router.get('/them', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    res.render('giaidau_them', {
        title: 'Thêm giải đấu'
    });
});

router.post('/them', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    try {
        var data = {
            TenGiaiDau: req.body.TenGiaiDau,
            NgayBatDau: req.body.NgayBatDau,
            NgayKetThuc: req.body.NgayKetThuc,
            TheThuc: req.body.TheThuc,
            SoLuongToiDa: req.body.SoLuongToiDa,
            TrangThai: req.body.TrangThai,
            MoTa: req.body.MoTa
        };

        var giaiDauMoi = await GiaiDau.create(data);

        await nhatKyHeThong.ghiNhatKy(req, {
            hanhDong: 'Thêm giải đấu',
            doiTuong: giaiDauMoi.TenGiaiDau,
            chiTiet: 'Giải đấu mới đã được tạo.',
            duLieuMoi: giaiDauMoi.toObject(),
            mucDo: 'Thong tin'
        });

        await thongBaoHeThong.taoThongBaoHeThong({
            tieuDe: 'Giải đấu mới',
            noiDung: 'Giải đấu "' + giaiDauMoi.TenGiaiDau + '" vừa được tạo.',
            loaiThongBao: 'GiaiDau',
            mucDo: 'Quan trong'
        });

        req.session.success = 'Đã thêm giải đấu thành công.';
        return res.redirect('/giaidau');
    } catch (err) {
        console.log(err);
        req.session.error = 'Không thể thêm giải đấu.';
        return res.redirect('/giaidau/them');
    }
});

router.get('/sua/:id', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    var gd = await GiaiDau.findById(req.params.id).exec();
    if (!gd) {
        req.session.error = 'Không tìm thấy giải đấu.';
        return res.redirect('/giaidau');
    }

    res.render('giaidau_sua', {
        title: 'Sửa giải đấu',
        giaidau: gd
    });
});

router.post('/sua/:id', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    try {
        var id = req.params.id;
        var giaiDauCu = await GiaiDau.findById(id).exec();

        var data = {
            TenGiaiDau: req.body.TenGiaiDau,
            NgayBatDau: req.body.NgayBatDau,
            NgayKetThuc: req.body.NgayKetThuc,
            TheThuc: req.body.TheThuc,
            SoLuongToiDa: req.body.SoLuongToiDa,
            TrangThai: req.body.TrangThai,
            MoTa: req.body.MoTa
        };

        await GiaiDau.findByIdAndUpdate(id, data).exec();

        await nhatKyHeThong.ghiNhatKy(req, {
            hanhDong: 'Cập nhật giải đấu',
            doiTuong: data.TenGiaiDau,
            chiTiet: 'Thông tin giải đấu đã được cập nhật.',
            duLieuCu: giaiDauCu ? giaiDauCu.toObject() : null,
            duLieuMoi: data,
            mucDo: 'Thong tin'
        });

        req.session.success = 'Đã cập nhật giải đấu thành công.';
        return res.redirect('/giaidau');
    } catch (err) {
        console.log(err);
        req.session.error = 'Không thể cập nhật giải đấu.';
        return res.redirect('/giaidau/sua/' + req.params.id);
    }
});

router.get('/xoa/:id', auth.yeuCauAdmin, async function (req, res) {
    try {
        var giaiDau = await GiaiDau.findById(req.params.id).exec();
        await GiaiDau.findByIdAndDelete(req.params.id).exec();

        await nhatKyHeThong.ghiNhatKy(req, {
            hanhDong: 'Xóa giải đấu',
            doiTuong: giaiDau ? giaiDau.TenGiaiDau : req.params.id,
            chiTiet: 'Giải đấu đã bị xóa khỏi hệ thống.',
            duLieuCu: giaiDau ? giaiDau.toObject() : null,
            mucDo: 'Quan trong'
        });

        req.session.success = 'Đã xóa giải đấu thành công.';
        return res.redirect('/giaidau');
    } catch (err) {
        console.log(err);
        req.session.error = 'Không thể xóa giải đấu.';
        return res.redirect('/giaidau');
    }
});

module.exports = router;
