var express = require('express');
var router = express.Router();

var DangKyGiaiDau = require('../models/dangkygiaidau');
var GiaiDau = require('../models/giaidau');
var NguoiChoi = require('../models/nguoichoi');
var DoiTuyen = require('../models/doituyen');
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

function normalizeApprovalStatus(input) {
    var normalized = normalizeText(input);
    if (normalized === 'da duyet') return 'Da duyet';
    if (normalized === 'tu choi') return 'Tu choi';
    if (normalized === 'huy') return 'Huy';
    return 'Cho duyet';
}

function toVietnameseApprovalStatus(input) {
    var normalized = normalizeText(input);
    if (normalized === 'da duyet') return 'Đã duyệt';
    if (normalized === 'tu choi') return 'Từ chối';
    if (normalized === 'huy') return 'Hủy';
    return 'Chờ duyệt';
}

function layVaiTro(req) {
    return (req.session && (req.session.VaiTro || req.session.QuyenHan)) || 'khach';
}

async function loadFormData() {
    var gd = await GiaiDau.find({ KichHoat: { $ne: false } }).sort({ TenGiaiDau: 1 }).lean().exec();
    var nc = await NguoiChoi.find({ KichHoat: true }).sort({ HoVaTen: 1 }).lean().exec();
    var dt = await DoiTuyen.find({ KichHoat: true }).sort({ TenDoi: 1 }).lean().exec();

    var giaiDauMeta = gd.map(function (item) {
        return {
            id: item._id.toString(),
            theThuc: item.TheThuc,
            isTeam: isTeamTournament(item.TheThuc)
        };
    });

    return {
        giaidau: gd,
        nguoichoi: nc,
        doituyen: dt,
        giaiDauMeta: giaiDauMeta
    };
}

router.get('/', auth.yeuCauDangNhap, async function (req, res) {
    var dk = await DangKyGiaiDau.find()
        .populate('GiaiDau')
        .populate('NguoiChoi')
        .populate('DoiTuyen')
        .sort({ NgayDangKy: -1 })
        .exec();

    var vaiTro = layVaiTro(req);

    // split into 1vs1 and team registrations for tabbed UI
    var dangKySolo = (dk || []).filter(function (item) {
        return !isTeamTournament(item && item.GiaiDau ? item.GiaiDau.TheThuc : null);
    });
    var dangKyTeam = (dk || []).filter(function (item) {
        return isTeamTournament(item && item.GiaiDau ? item.GiaiDau.TheThuc : null);
    });

    res.render('dangkygiaidau', {
        title: 'Đăng ký giải đấu',
        dangKySolo: dangKySolo,
        dangKyTeam: dangKyTeam,
        toVietnameseApprovalStatus: toVietnameseApprovalStatus,
        canManage: (vaiTro === 'admin' || vaiTro === 'nhanvien'),
        isAdmin: vaiTro === 'admin'
    });
});

router.get('/them', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    var mode = (req.query && req.query.mode) ? req.query.mode.toString() : '';
    var formData = await loadFormData();

    // server-side pre-filter tournaments according to requested mode
    var giaidau = formData.giaidau || [];
    if (mode === '1vs1') {
        giaidau = giaidau.filter(function (g) { return !isTeamTournament(g.TheThuc); });
    }
    else if (mode === 'doi' || mode === 'team' || mode === 'dongdoi') {
        giaidau = giaidau.filter(function (g) { return isTeamTournament(g.TheThuc); });
    }

    res.render('dangkygiaidau_them', {
        title: 'Thêm đăng ký giải đấu',
        giaidau: giaidau,
        nguoichoi: formData.nguoichoi,
        doituyen: formData.doituyen,
        giaiDauMeta: formData.giaiDauMeta,
        mode: mode
    });
});

router.post('/them', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    try {
        var giaiDau = await GiaiDau.findById(req.body.GiaiDau).lean().exec();
        if (!giaiDau) {
            req.session.error = 'Không tìm thấy giải đấu.';
            return res.redirect('/dangkygiaidau/them');
        }

        var isTeam = isTeamTournament(giaiDau.TheThuc);
        var data = {
            GiaiDau: req.body.GiaiDau,
            NguoiChoi: isTeam ? null : (req.body.NguoiChoi || null),
            DoiTuyen: isTeam ? (req.body.DoiTuyen || null) : null,
            NgayDangKy: req.body.NgayDangKy || new Date(),
            TrangThaiDuyet: normalizeApprovalStatus(req.body.TrangThaiDuyet)
        };

        var dangKyMoi = await DangKyGiaiDau.create(data);

        await nhatKyHeThong.ghiNhatKy(req, {
            hanhDong: 'Thêm đăng ký giải đấu',
            doiTuong: giaiDau.TenGiaiDau,
            chiTiet: 'Một đăng ký giải đấu mới đã được tạo.',
            duLieuMoi: dangKyMoi.toObject(),
            mucDo: 'Thong tin'
        });

        await thongBaoHeThong.taoThongBaoHeThong({
            tieuDe: 'Đăng ký giải đấu mới',
            noiDung: 'Có đăng ký mới cho giải "' + giaiDau.TenGiaiDau + '".',
            loaiThongBao: 'DangKy',
            mucDo: 'Thong tin'
        });

        req.session.success = 'Đã thêm đăng ký giải đấu thành công.';
        return res.redirect('/dangkygiaidau');
    }
    catch (err) {
        console.log(err);
        req.session.error = err.message || 'Không thể thêm đăng ký giải đấu.';
        return res.redirect('/dangkygiaidau/them');
    }
});

router.get('/sua/:id', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    var id = req.params.id;
    var dk = await DangKyGiaiDau.findById(id).lean().exec();
    if (!dk) {
        req.session.error = 'Không tìm thấy đăng ký.';
        return res.redirect('/dangkygiaidau');
    }

    var formData = await loadFormData();
    res.render('dangkygiaidau_sua', {
        title: 'Sửa đăng ký giải đấu',
        dangkygiaidau: dk,
        giaidau: formData.giaidau,
        nguoichoi: formData.nguoichoi,
        doituyen: formData.doituyen,
        giaiDauMeta: formData.giaiDauMeta
    });
});

router.post('/sua/:id', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    try {
        var id = req.params.id;
        var dangKyCu = await DangKyGiaiDau.findById(id).exec();
        if (!dangKyCu) {
            req.session.error = 'Không tìm thấy đăng ký.';
            return res.redirect('/dangkygiaidau');
        }

        var giaiDau = await GiaiDau.findById(req.body.GiaiDau).lean().exec();
        if (!giaiDau) {
            req.session.error = 'Không tìm thấy giải đấu.';
            return res.redirect('/dangkygiaidau/sua/' + id);
        }

        var isTeam = isTeamTournament(giaiDau.TheThuc);
        var data = {
            GiaiDau: req.body.GiaiDau,
            NguoiChoi: isTeam ? null : (req.body.NguoiChoi || null),
            DoiTuyen: isTeam ? (req.body.DoiTuyen || null) : null,
            NgayDangKy: req.body.NgayDangKy || dangKyCu.NgayDangKy,
            TrangThaiDuyet: normalizeApprovalStatus(req.body.TrangThaiDuyet)
        };

        await DangKyGiaiDau.findByIdAndUpdate(id, data, { runValidators: true }).exec();

        await nhatKyHeThong.ghiNhatKy(req, {
            hanhDong: 'Cập nhật đăng ký giải đấu',
            doiTuong: giaiDau.TenGiaiDau,
            chiTiet: 'Đăng ký giải đấu đã được cập nhật.',
            duLieuCu: dangKyCu.toObject(),
            duLieuMoi: data,
            mucDo: 'Thong tin'
        });

        await thongBaoHeThong.taoThongBaoHeThong({
            tieuDe: 'Cập nhật đăng ký giải đấu',
            noiDung: 'Đăng ký của giải "' + giaiDau.TenGiaiDau + '" vừa được cập nhật.',
            loaiThongBao: 'DangKy',
            mucDo: 'Thong tin'
        });

        req.session.success = 'Đã cập nhật đăng ký giải đấu thành công.';
        return res.redirect('/dangkygiaidau');
    }
    catch (err) {
        console.log(err);
        req.session.error = err.message || 'Không thể cập nhật đăng ký giải đấu.';
        return res.redirect('/dangkygiaidau/sua/' + req.params.id);
    }
});

router.get('/xoa/:id', auth.yeuCauAdmin, async function (req, res) {
    try {
        var id = req.params.id;
        var dangKy = await DangKyGiaiDau.findById(id).populate('GiaiDau').exec();
        if (dangKy) {
            await DangKyGiaiDau.findByIdAndDelete(id).exec();

            await nhatKyHeThong.ghiNhatKy(req, {
                hanhDong: 'Xóa đăng ký giải đấu',
                doiTuong: dangKy.GiaiDau ? dangKy.GiaiDau.TenGiaiDau : id,
                chiTiet: 'Đăng ký giải đấu đã bị xóa.',
                duLieuCu: dangKy.toObject(),
                mucDo: 'Quan trong'
            });

            await thongBaoHeThong.taoThongBaoHeThong({
                tieuDe: 'Xóa đăng ký giải đấu',
                noiDung: 'Một đăng ký giải đấu vừa bị xóa.',
                loaiThongBao: 'DangKy',
                mucDo: 'Canh bao'
            });
        }

        req.session.success = 'Đã xóa đăng ký giải đấu thành công.';
        return res.redirect('/dangkygiaidau');
    }
    catch (err) {
        console.log(err);
        req.session.error = 'Không thể xóa đăng ký giải đấu.';
        return res.redirect('/dangkygiaidau');
    }
});

module.exports = router;
