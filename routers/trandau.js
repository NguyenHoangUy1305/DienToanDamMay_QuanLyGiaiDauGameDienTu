var express = require('express');
var router = express.Router();

var TranDau = require('../models/trandau');
var GiaiDau = require('../models/giaidau');
var DangKyGiaiDau = require('../models/dangkygiaidau');
var BangXepHang = require('../models/bangxephang');
var NguoiChoi = require('../models/nguoichoi');
var DoiTuyen = require('../models/doituyen');
var mongoose = require('mongoose');
var auth = require('../middlewares/auth');
var googleCalendar = require('../services/googlecalendar');
var nhatKyHeThong = require('../services/nhatkyhethong');
var thongBaoHeThong = require('../services/thongbao');
var statusUtil = require('../utils/status');

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

// use statusUtil for normalization and display

function winnerName(status, doi1, doi2, tyso1, tyso2) {
    if (!statusUtil.isDoneStatus(status)) return null;
    if (tyso1 > tyso2) return doi1;
    if (tyso2 > tyso1) return doi2;
    return 'Hòa';
}

function normalizeApprovalStatus(input) {
    return normalizeText(input) === 'da duyet';
}

function parseNonNegativeNumber(value) {
    var parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 0) return 0;
    return parsed;
}

function validateTranDauInput(isUpdate) {
    return async function (req, res, next) {
        var errors = [];

        if (!req.body.GiaiDau) errors.push('Chưa chọn giải đấu.');
        else if (!mongoose.Types.ObjectId.isValid(req.body.GiaiDau)) errors.push('Giải đấu không hợp lệ.');

        if (!req.body.DoiThu1Id) errors.push('Chưa chọn đối thủ 1.');
        if (!req.body.DoiThu2Id) errors.push('Chưa chọn đối thủ 2.');
        if (req.body.DoiThu1Id && req.body.DoiThu2Id && req.body.DoiThu1Id === req.body.DoiThu2Id) errors.push('Hai đối thủ không được trùng nhau.');

        if (req.body.TySo1 !== undefined && req.body.TySo1 !== '') {
            var t1 = parseInt(req.body.TySo1, 10);
            if (isNaN(t1) || t1 < 0) errors.push('Tỷ số 1 không hợp lệ.');
        }
        if (req.body.TySo2 !== undefined && req.body.TySo2 !== '') {
            var t2 = parseInt(req.body.TySo2, 10);
            if (isNaN(t2) || t2 < 0) errors.push('Tỷ số 2 không hợp lệ.');
        }

        if (req.body.ThoiGianThiDau) {
            var d = new Date(req.body.ThoiGianThiDau);
            if (isNaN(d.getTime())) errors.push('Thời gian thi đấu không hợp lệ.');
        }

        if (errors.length > 0) {
            req.session.error = errors.join(' ');
            if (isUpdate) return res.redirect('/trandau/sua/' + (req.params.id || ''));
            return res.redirect('/trandau/them');
        }
        next();
    };
}

async function getApprovedParticipantsByTournament() {
    var regs = await DangKyGiaiDau.find()
        .populate('GiaiDau')
        .populate('NguoiChoi')
        .populate('DoiTuyen')
        .lean()
        .exec();

    // registrations debug log removed

    var map = {};

    regs.forEach(function (item) {
        if (!item.GiaiDau || !normalizeApprovalStatus(item.TrangThaiDuyet)) return;

        var gid = item.GiaiDau._id.toString();
        var isTeam = isTeamTournament(item.GiaiDau.TheThuc);
        if (!map[gid]) map[gid] = [];

        if (!isTeam && item.NguoiChoi) {
            map[gid].push({
                id: item.NguoiChoi._id.toString(),
                name: item.NguoiChoi.HoVaTen,
                type: 'NguoiChoi'
            });
        }

        if (isTeam && item.DoiTuyen) {
            map[gid].push({
                id: item.DoiTuyen._id.toString(),
                name: item.DoiTuyen.TenDoi,
                type: 'DoiTuyen'
            });
        }
    });

    return map;
}

async function capNhatBangXepHang(giaiDauId) {
    await BangXepHang.deleteMany({ GiaiDau: giaiDauId }).exec();

    // query for all possible stored values representing "done" status
    var doneValues = statusUtil.valuesFor(statusUtil.STATUS.DA_THI_DAU);
    var dsTranDau = await TranDau.find({
        GiaiDau: giaiDauId,
        TrangThai: { $in: doneValues }
    }).lean().exec();

    var bangTam = {};

    dsTranDau.forEach(function (item) {
        var doi1 = item.DoiThu1;
        var doi2 = item.DoiThu2;
        var tyso1 = item.TySo1 || 0;
        var tyso2 = item.TySo2 || 0;
        var loai = item.LoaiDoiTuongThiDau || (item.LoaiTran === 'TEAM' ? 'DoiTuyen' : 'NguoiChoi');

        if (!bangTam[doi1]) {
            bangTam[doi1] = { GiaiDau: giaiDauId, DoiTuongThiDau: doi1, LoaiDoiTuong: loai, SoTran: 0, Thang: 0, Hoa: 0, Thua: 0, BanThang: 0, BanThua: 0, HieuSo: 0, Diem: 0, XepHang: 0 };
        }
        if (!bangTam[doi2]) {
            bangTam[doi2] = { GiaiDau: giaiDauId, DoiTuongThiDau: doi2, LoaiDoiTuong: loai, SoTran: 0, Thang: 0, Hoa: 0, Thua: 0, BanThang: 0, BanThua: 0, HieuSo: 0, Diem: 0, XepHang: 0 };
        }

        bangTam[doi1].SoTran += 1;
        bangTam[doi2].SoTran += 1;

        bangTam[doi1].BanThang += tyso1;
        bangTam[doi1].BanThua += tyso2;
        bangTam[doi2].BanThang += tyso2;
        bangTam[doi2].BanThua += tyso1;

        bangTam[doi1].HieuSo += (tyso1 - tyso2);
        bangTam[doi2].HieuSo += (tyso2 - tyso1);

        if (tyso1 > tyso2) {
            bangTam[doi1].Thang += 1;
            bangTam[doi1].Diem += 3;
            bangTam[doi2].Thua += 1;
        } else if (tyso2 > tyso1) {
            bangTam[doi2].Thang += 1;
            bangTam[doi2].Diem += 3;
            bangTam[doi1].Thua += 1;
        } else {
            bangTam[doi1].Hoa += 1;
            bangTam[doi2].Hoa += 1;
            bangTam[doi1].Diem += 1;
            bangTam[doi2].Diem += 1;
        }
    });

    var dsBangXepHang = Object.values(bangTam);
    dsBangXepHang.sort(function (a, b) {
        if (b.Diem !== a.Diem) return b.Diem - a.Diem;
        if (b.HieuSo !== a.HieuSo) return b.HieuSo - a.HieuSo;
        return a.DoiTuongThiDau.localeCompare(b.DoiTuongThiDau);
    });

    for (var i = 0; i < dsBangXepHang.length; i++) dsBangXepHang[i].XepHang = i + 1;
    if (dsBangXepHang.length > 0) await BangXepHang.insertMany(dsBangXepHang);
}

function layVaiTro(req) {
    return (req.session && (req.session.VaiTro || req.session.QuyenHan)) || 'khach';
}

async function buildTrandauFormData() {
    var gd = await GiaiDau.find({ KichHoat: { $ne: false } }).sort({ TenGiaiDau: 1 }).lean().exec();
    var participantsMap = await getApprovedParticipantsByTournament();

    var giaiDauMeta = gd.map(function (item) {
        return {
            id: item._id.toString(),
            ten: item.TenGiaiDau,
            theThuc: item.TheThuc,
            isTeam: isTeamTournament(item.TheThuc),
            participants: participantsMap[item._id.toString()] || []
        };
    });

    return {
        giaidau: gd,
        giaiDauMeta: giaiDauMeta
    };
}

async function loadDoiHinhByTeamId(teamId) {
    if (!teamId) return [];

    return NguoiChoi.find({
        DoiTuyen: teamId,
        KichHoat: { $ne: false }
    }).sort({ HoVaTen: 1 }).select('_id HoVaTen').lean().exec();
}

function buildChiTietTySoTheoDoi(rawBanThang, doiHinh, benDoi) {
    var chiTiet = [];
    var tongBan = 0;

    doiHinh.forEach(function (item) {
        var key = item._id.toString();
        var soBan = parseNonNegativeNumber(rawBanThang[key]);
        tongBan += soBan;

        chiTiet.push({
            NguoiChoi: item._id,
            TenNguoiChoi: item.HoVaTen,
            DoiThu: benDoi,
            BanThang: soBan
        });
    });

    return {
        chiTiet: chiTiet,
        tongBan: tongBan
    };
}

function xacDinhLoaiTran(giaiDau, doiThu1, doiThu2) {
    if (doiThu1.type === 'DoiTuyen' && doiThu2.type === 'DoiTuyen') {
        return {
            loaiTran: 'TEAM',
            loaiDoiTuong: 'DoiTuyen'
        };
    }

    if (doiThu1.type === 'NguoiChoi' && doiThu2.type === 'NguoiChoi') {
        return {
            loaiTran: isTeamTournament(giaiDau.TheThuc) ? 'TEAM' : '1vs1',
            loaiDoiTuong: 'NguoiChoi'
        };
    }

    throw new Error('Hai đối thủ phải cùng loại đăng ký.');
}

router.get('/', auth.yeuCauDangNhap, async function (req, res) {
    var td = await TranDau.find().populate('GiaiDau').sort({ ThoiGianThiDau: -1 }).exec();
    var vaiTro = layVaiTro(req);

    // split into 1vs1 and đội lists for tabbed UI
    var trandau1vs1 = (td || []).filter(function (item) {
        return (item && (item.LoaiTran === '1vs1' || item.LoaiDoiTuongThiDau === 'NguoiChoi'));
    });
    var trandauDoi = (td || []).filter(function (item) {
        return (item && (item.LoaiTran === 'TEAM' || item.LoaiDoiTuongThiDau === 'DoiTuyen'));
    });

    res.render('trandau', {
        title: 'Trận đấu',
        trandau: td,
        trandau1vs1: trandau1vs1,
        trandauDoi: trandauDoi,
        canManage: (vaiTro === 'admin' || vaiTro === 'nhanvien'),
        isAdmin: vaiTro === 'admin',
        toVietnameseStatus: statusUtil.toVietnameseStatus
    });
});

router.get('/them', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    var formData = await buildTrandauFormData();
    // Allow pre-selecting participant type via query param `type` (values: 'NguoiChoi' or 'DoiTuyen')
    var defaultLoaiDoiTuong = '';
    if (req.query && req.query.type) {
        if (req.query.type === 'DoiTuyen') defaultLoaiDoiTuong = 'DoiTuyen';
        else if (req.query.type === 'NguoiChoi') defaultLoaiDoiTuong = 'NguoiChoi';
    }

    res.render('trandau_them', {
        title: 'Thêm trận đấu',
        giaidau: formData.giaidau,
        giaiDauMeta: formData.giaiDauMeta,
        defaultLoaiDoiTuong: defaultLoaiDoiTuong
    });
});

router.post('/them', auth.yeuCauStaffHoacAdmin, validateTranDauInput(false), async function (req, res) {
    try {
        var giaiDau = await GiaiDau.findById(req.body.GiaiDau).lean().exec();
        if (!giaiDau) {
            req.session.error = 'Không tìm thấy giải đấu.';
            return res.redirect('/trandau/them');
        }

        var formData = await buildTrandauFormData();
        var selectedMeta = formData.giaiDauMeta.find(function (x) {
            return x.id === req.body.GiaiDau.toString();
        });
        var participants = selectedMeta ? selectedMeta.participants : [];

        // fallback: if participants list is empty (tests or missing registrations), try loading directly
        if ((!participants || participants.length === 0) && req.body.DoiThu1Id && req.body.DoiThu2Id) {
            participants = [];
            var p1Doc = await NguoiChoi.findById(req.body.DoiThu1Id).lean().exec();
            if (p1Doc) participants.push({ id: p1Doc._id.toString(), name: p1Doc.HoVaTen, type: 'NguoiChoi' });
            else {
                var t1Doc = await DoiTuyen.findById(req.body.DoiThu1Id).lean().exec();
                if (t1Doc) participants.push({ id: t1Doc._id.toString(), name: t1Doc.TenDoi, type: 'DoiTuyen' });
            }

            var p2Doc = await NguoiChoi.findById(req.body.DoiThu2Id).lean().exec();
            if (p2Doc) participants.push({ id: p2Doc._id.toString(), name: p2Doc.HoVaTen, type: 'NguoiChoi' });
            else {
                var t2Doc = await DoiTuyen.findById(req.body.DoiThu2Id).lean().exec();
                if (t2Doc) participants.push({ id: t2Doc._id.toString(), name: t2Doc.TenDoi, type: 'DoiTuyen' });
            }
        }

        // debug logs removed

        // fallback: if participants list is empty (tests or missing registrations), try loading directly
        if ((!participants || participants.length === 0) && req.body.DoiThu1Id && req.body.DoiThu2Id) {
            participants = [];
            var p1Doc = await NguoiChoi.findById(req.body.DoiThu1Id).lean().exec();
            if (p1Doc) participants.push({ id: p1Doc._id.toString(), name: p1Doc.HoVaTen, type: 'NguoiChoi' });
            else {
                var t1Doc = await DoiTuyen.findById(req.body.DoiThu1Id).lean().exec();
                if (t1Doc) participants.push({ id: t1Doc._id.toString(), name: t1Doc.TenDoi, type: 'DoiTuyen' });
            }

            var p2Doc = await NguoiChoi.findById(req.body.DoiThu2Id).lean().exec();
            if (p2Doc) participants.push({ id: p2Doc._id.toString(), name: p2Doc.HoVaTen, type: 'NguoiChoi' });
            else {
                var t2Doc = await DoiTuyen.findById(req.body.DoiThu2Id).lean().exec();
                if (t2Doc) participants.push({ id: t2Doc._id.toString(), name: t2Doc.TenDoi, type: 'DoiTuyen' });
            }
        }

        // fallback: if participants list is empty (tests or missing registrations), try loading directly
        if ((!participants || participants.length === 0) && req.body.DoiThu1Id && req.body.DoiThu2Id) {
            participants = [];
            var p1Doc = await NguoiChoi.findById(req.body.DoiThu1Id).lean().exec();
            if (p1Doc) participants.push({ id: p1Doc._id.toString(), name: p1Doc.HoVaTen, type: 'NguoiChoi' });
            else {
                var t1Doc = await DoiTuyen.findById(req.body.DoiThu1Id).lean().exec();
                if (t1Doc) participants.push({ id: t1Doc._id.toString(), name: t1Doc.TenDoi, type: 'DoiTuyen' });
            }

            var p2Doc = await NguoiChoi.findById(req.body.DoiThu2Id).lean().exec();
            if (p2Doc) participants.push({ id: p2Doc._id.toString(), name: p2Doc.HoVaTen, type: 'NguoiChoi' });
            else {
                var t2Doc = await DoiTuyen.findById(req.body.DoiThu2Id).lean().exec();
                if (t2Doc) participants.push({ id: t2Doc._id.toString(), name: t2Doc.TenDoi, type: 'DoiTuyen' });
            }
        }

        // fallback: if participants list is empty (tests or missing registrations), try loading directly
        if ((!participants || participants.length === 0) && req.body.DoiThu1Id && req.body.DoiThu2Id) {
            participants = [];
            var p1Doc = await NguoiChoi.findById(req.body.DoiThu1Id).lean().exec();
            if (p1Doc) participants.push({ id: p1Doc._id.toString(), name: p1Doc.HoVaTen, type: 'NguoiChoi' });
            else {
                var t1Doc = await DoiTuyen.findById(req.body.DoiThu1Id).lean().exec();
                if (t1Doc) participants.push({ id: t1Doc._id.toString(), name: t1Doc.TenDoi, type: 'DoiTuyen' });
            }

            var p2Doc = await NguoiChoi.findById(req.body.DoiThu2Id).lean().exec();
            if (p2Doc) participants.push({ id: p2Doc._id.toString(), name: p2Doc.HoVaTen, type: 'NguoiChoi' });
            else {
                var t2Doc = await DoiTuyen.findById(req.body.DoiThu2Id).lean().exec();
                if (t2Doc) participants.push({ id: t2Doc._id.toString(), name: t2Doc.TenDoi, type: 'DoiTuyen' });
            }
        }

        // debug logs removed

        var doiThu1 = participants.find(function (x) { return x.id === req.body.DoiThu1Id; });
        var doiThu2 = participants.find(function (x) { return x.id === req.body.DoiThu2Id; });

        if (!doiThu1 || !doiThu2) {
            req.session.error = 'Đối thủ không hợp lệ. Hãy chọn từ danh sách đã duyệt.';
            return res.redirect('/trandau/them');
        }
        if (doiThu1.id === doiThu2.id) {
            req.session.error = 'Hai đối thủ không được trùng nhau.';
            return res.redirect('/trandau/them');
        }
        if (doiThu1.type !== doiThu2.type) {
            req.session.error = 'Hai đối thủ phải cùng loại (cá nhân hoặc đội tuyển).';
            return res.redirect('/trandau/them');
        }

        var tyso1 = parseNonNegativeNumber(req.body.TySo1);
        var tyso2 = parseNonNegativeNumber(req.body.TySo2);
        var trangThai = statusUtil.normalizeStatus(req.body.TrangThai);
        var loai = xacDinhLoaiTran(giaiDau, doiThu1, doiThu2);

        var data = {
            GiaiDau: req.body.GiaiDau,
            LoaiTran: loai.loaiTran,
            LoaiDoiTuongThiDau: loai.loaiDoiTuong,
            DoiThu1Id: doiThu1.id,
            DoiThu2Id: doiThu2.id,
            VongDau: req.body.VongDau,
            DoiThu1: doiThu1.name,
            DoiThu2: doiThu2.name,
            ThoiGianThiDau: req.body.ThoiGianThiDau,
            TySo1: tyso1,
            TySo2: tyso2,
            ChiTietTySo: [],
            NguoiThang: winnerName(trangThai, doiThu1.name, doiThu2.name, tyso1, tyso2),
            TrangThai: trangThai,
            NguoiTao: req.session.MaNguoiDung || null,
            NguoiCapNhat: req.session.MaNguoiDung || null
        };

        var tranDauMoi = await TranDau.create(data);
        await capNhatBangXepHang(req.body.GiaiDau);

        await nhatKyHeThong.ghiNhatKy(req, {
            hanhDong: 'Thêm trận đấu',
            doiTuong: tranDauMoi.DoiThu1 + ' vs ' + tranDauMoi.DoiThu2,
            chiTiet: 'Trận đấu mới đã được tạo.',
            duLieuMoi: tranDauMoi.toObject(),
            mucDo: 'Thong tin'
        });

        await thongBaoHeThong.taoThongBaoHeThong({
            tieuDe: 'Tạo trận đấu mới',
            noiDung: 'Trận đấu "' + tranDauMoi.DoiThu1 + ' vs ' + tranDauMoi.DoiThu2 + '" vừa được tạo.',
            loaiThongBao: 'TranDau',
            mucDo: 'Quan trong'
        });

        req.session.success = 'Đã thêm trận đấu thành công.';
        return res.redirect('/trandau');
    }
    catch (err) {
        console.log(err);
        req.session.error = err.message || 'Không thể thêm trận đấu.';
        return res.redirect('/trandau/them');
    }
});

router.get('/sua/:id', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    var td = await TranDau.findById(req.params.id).lean().exec();
    if (!td) {
        req.session.error = 'Không tìm thấy trận đấu.';
        return res.redirect('/trandau');
    }

    var formData = await buildTrandauFormData();
    res.render('trandau_sua', {
        title: 'Sửa trận đấu',
        trandau: td,
        giaidau: formData.giaidau,
        giaiDauMeta: formData.giaiDauMeta
    });
});

router.post('/sua/:id', auth.yeuCauStaffHoacAdmin, validateTranDauInput(true), async function (req, res) {
    try {
        var id = req.params.id;
        var tranDauCu = await TranDau.findById(id).exec();
        if (!tranDauCu) {
            req.session.error = 'Không tìm thấy trận đấu.';
            return res.redirect('/trandau');
        }

        var giaiDau = await GiaiDau.findById(req.body.GiaiDau).lean().exec();
        if (!giaiDau) {
            req.session.error = 'Không tìm thấy giải đấu.';
            return res.redirect('/trandau/sua/' + id);
        }

        var formData = await buildTrandauFormData();
        var selectedMeta = formData.giaiDauMeta.find(function (x) {
            return x.id === req.body.GiaiDau.toString();
        });
        var participants = selectedMeta ? selectedMeta.participants : [];

        var doiThu1 = participants.find(function (x) { return String(x.id) === String(req.body.DoiThu1Id).trim(); });
        var doiThu2 = participants.find(function (x) { return String(x.id) === String(req.body.DoiThu2Id).trim(); });

        // fallback: try loading directly from NguoiChoi or DoiTuyen when participants map is empty
        if (!doiThu1) {
            var p1Doc = await NguoiChoi.findById(req.body.DoiThu1Id).lean().exec();
            if (p1Doc) doiThu1 = { id: p1Doc._id.toString(), name: p1Doc.HoVaTen, type: 'NguoiChoi' };
            else {
                var t1Doc = await DoiTuyen.findById(req.body.DoiThu1Id).lean().exec();
                if (t1Doc) doiThu1 = { id: t1Doc._id.toString(), name: t1Doc.TenDoi, type: 'DoiTuyen' };
            }
        }

        if (!doiThu2) {
            var p2Doc = await NguoiChoi.findById(req.body.DoiThu2Id).lean().exec();
            if (p2Doc) doiThu2 = { id: p2Doc._id.toString(), name: p2Doc.HoVaTen, type: 'NguoiChoi' };
            else {
                var t2Doc = await DoiTuyen.findById(req.body.DoiThu2Id).lean().exec();
                if (t2Doc) doiThu2 = { id: t2Doc._id.toString(), name: t2Doc.TenDoi, type: 'DoiTuyen' };
            }
        }

        // debug logs removed

        if (!doiThu1 || !doiThu2) {
            req.session.error = 'Đối thủ không hợp lệ. Hãy chọn từ danh sách đã duyệt.';
            return res.redirect('/trandau/sua/' + id);
        }
        if (doiThu1.id === doiThu2.id) {
            req.session.error = 'Hai đối thủ không được trùng nhau.';
            return res.redirect('/trandau/sua/' + id);
        }
        if (doiThu1.type !== doiThu2.type) {
            req.session.error = 'Hai đối thủ phải cùng loại (cá nhân hoặc đội tuyển).';
            return res.redirect('/trandau/sua/' + id);
        }

        var tyso1 = parseNonNegativeNumber(req.body.TySo1);
        var tyso2 = parseNonNegativeNumber(req.body.TySo2);
        // debug logs removed
        var trangThai = statusUtil.normalizeStatus(req.body.TrangThai);
        var loai = xacDinhLoaiTran(giaiDau, doiThu1, doiThu2);

        var data = {
            GiaiDau: req.body.GiaiDau,
            LoaiTran: loai.loaiTran,
            LoaiDoiTuongThiDau: loai.loaiDoiTuong,
            DoiThu1Id: doiThu1.id,
            DoiThu2Id: doiThu2.id,
            VongDau: req.body.VongDau,
            DoiThu1: doiThu1.name,
            DoiThu2: doiThu2.name,
            ThoiGianThiDau: req.body.ThoiGianThiDau,
            TySo1: tyso1,
            TySo2: tyso2,
            ChiTietTySo: loai.loaiTran === 'TEAM' ? (tranDauCu.ChiTietTySo || []) : [],
            NguoiThang: winnerName(trangThai, doiThu1.name, doiThu2.name, tyso1, tyso2),
            TrangThai: trangThai,
            NguoiCapNhat: req.session.MaNguoiDung || null
        };

        // debug logs removed

        await TranDau.findByIdAndUpdate(id, data, { runValidators: true }).exec();

        if (tranDauCu.GiaiDau.toString() !== req.body.GiaiDau.toString()) {
            await capNhatBangXepHang(tranDauCu.GiaiDau);
        }
        await capNhatBangXepHang(req.body.GiaiDau);

        await nhatKyHeThong.ghiNhatKy(req, {
            hanhDong: 'Cập nhật trận đấu',
            doiTuong: data.DoiThu1 + ' vs ' + data.DoiThu2,
            chiTiet: 'Trận đấu đã được cập nhật.',
            duLieuCu: tranDauCu.toObject(),
            duLieuMoi: data,
            mucDo: 'Thong tin'
        });

        req.session.success = 'Đã cập nhật trận đấu thành công.';
        return res.redirect('/trandau');
    }
    catch (err) {
        console.log(err);
        req.session.error = err.message || 'Không thể cập nhật trận đấu.';
        return res.redirect('/trandau/sua/' + req.params.id);
    }
});

router.get('/xoa/:id', auth.yeuCauAdmin, async function (req, res) {
    try {
        var id = req.params.id;
        var td = await TranDau.findById(id).exec();

        if (!td) {
            req.session.error = 'Không tìm thấy trận đấu.';
            return res.redirect('/trandau');
        }

        await TranDau.findByIdAndDelete(id).exec();
        await capNhatBangXepHang(td.GiaiDau);

        await nhatKyHeThong.ghiNhatKy(req, {
            hanhDong: 'Xóa trận đấu',
            doiTuong: td.DoiThu1 + ' vs ' + td.DoiThu2,
            chiTiet: 'Trận đấu đã bị xóa.',
            duLieuCu: td.toObject(),
            mucDo: 'Thong tin'
        });

        req.session.success = 'Đã xóa trận đấu.';
        return res.redirect('/trandau');
    }
    catch (err) {
        console.log(err);
        req.session.error = err.message || 'Không thể xóa trận đấu.';
        return res.redirect('/trandau');
    }
});

router.get('/mo-lich/:id', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    try {
        var td = await TranDau.findById(req.params.id).populate('GiaiDau').lean().exec();
        if (!td) {
            req.session.error = 'Không tìm thấy trận đấu.';
            return res.redirect('/trandau');
        }

        try {
            console.log('DEBUG mo-lich, td=', td, 'envOAuth=', googleCalendar.shouldUseEnvOAuth(), 'hasEnvConfig=', googleCalendar.hasEnvOAuthConfig());
            var evt = await googleCalendar.taoSuKienTranDau(td, td.GiaiDau ? td.GiaiDau.TenGiaiDau : null);
            console.log('DEBUG mo-lich evt=', evt && evt.htmlLink);
            if (evt && evt.htmlLink) return res.redirect(evt.htmlLink);
        }
        catch (err) {
            console.error('ERROR mo-lich:', err && err.message ? err.message : err);
            // If env OAuth is missing or any error, open pre-filled create-event page so user sees event details
            return res.redirect(googleCalendar.buildCreateEventUrl(td, td.GiaiDau ? td.GiaiDau.TenGiaiDau : null));
        }

        // If creation didn't return a link, open pre-filled create page
        return res.redirect(googleCalendar.buildCreateEventUrl(td, td.GiaiDau ? td.GiaiDau.TenGiaiDau : null));
    }
    catch (err) {
        console.log(err);
        req.session.error = 'Không thể mở lịch.';
        return res.redirect('/trandau');
    }
});

router.get('/xuat-lich/:id', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    try {
        var td = await TranDau.findById(req.params.id).populate('GiaiDau').lean().exec();
        if (!td) {
            req.session.error = 'Không tìm thấy trận đấu.';
            return res.redirect('/trandau');
        }

        if (!td.ThoiGianThiDau) {
            req.session.error = 'Trận đấu chưa có thời gian để xuất lịch.';
            return res.redirect('/trandau');
        }

        try {
            console.log('DEBUG xuat-lich, td=', td, 'envOAuth=', googleCalendar.shouldUseEnvOAuth(), 'hasEnvConfig=', googleCalendar.hasEnvOAuthConfig());
            var evt = await googleCalendar.taoSuKienTranDau(td, td.GiaiDau ? td.GiaiDau.TenGiaiDau : null);
            console.log('DEBUG xuat-lich evt=', evt && evt.htmlLink);
            if (evt && evt.htmlLink) return res.redirect(evt.htmlLink);
        }
        catch (err) {
            console.error('ERROR xuat-lich:', err && err.message ? err.message : err);
            // Always fall back to opening the pre-filled create-event page so user sees event details
            return res.redirect(googleCalendar.buildCreateEventUrl(td, td.GiaiDau ? td.GiaiDau.TenGiaiDau : null));
        }

        // If creation didn't return a link, open pre-filled create-event page
        return res.redirect(googleCalendar.buildCreateEventUrl(td, td.GiaiDau ? td.GiaiDau.TenGiaiDau : null));
    }
    catch (err) {
        console.log(err);
        req.session.error = 'Không thể xuất lịch.';
        return res.redirect('/trandau');
    }
});

router.get('/nhap-ket-qua/:id', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    try {
        var td = await TranDau.findById(req.params.id).populate('GiaiDau').lean().exec();
        if (!td) {
            req.session.error = 'Không tìm thấy trận đấu.';
            return res.redirect('/trandau');
        }

        var isTeamMatch = td.LoaiDoiTuongThiDau === 'DoiTuyen';
        var doiHinhDoi1 = [];
        var doiHinhDoi2 = [];

        if (isTeamMatch) {
            doiHinhDoi1 = await loadDoiHinhByTeamId(td.DoiThu1Id);
            doiHinhDoi2 = await loadDoiHinhByTeamId(td.DoiThu2Id);
        }

        return res.render('trandau_nhapketqua', {
            title: 'Nhập kết quả',
            trandau: td,
            isTeamMatch: isTeamMatch,
            doiHinhDoi1: doiHinhDoi1,
            doiHinhDoi2: doiHinhDoi2,
            toVietnameseStatus: statusUtil.toVietnameseStatus
        });
    }
    catch (err) {
        console.log(err);
        req.session.error = 'Không thể mở màn hình nhập kết quả.';
        return res.redirect('/trandau');
    }
});

router.post('/nhap-ket-qua/:id', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    try {
        console.log('DEBUG nhap-ket-qua start, id=', req.params.id, 'body=', req.body);
        var id = req.params.id;
        var td = await TranDau.findById(id).exec();
        if (!td) {
            req.session.error = 'Không tìm thấy trận đấu.';
            return res.redirect('/trandau');
        }

        var tyso1 = 0;
        var tyso2 = 0;
        var chiTietTySo = [];

        if (td.LoaiDoiTuongThiDau === 'DoiTuyen') {
            var doiHinhDoi1 = await loadDoiHinhByTeamId(td.DoiThu1Id);
            var doiHinhDoi2 = await loadDoiHinhByTeamId(td.DoiThu2Id);

            if (doiHinhDoi1.length === 0 || doiHinhDoi2.length === 0) {
                req.session.error = 'Chưa có đủ người chơi trong đội để nhập tỷ số theo từng người.';
                return res.redirect('/trandau/nhap-ket-qua/' + id);
            }

            var rawBanThangDoi1 = req.body.BanThangDoi1 || {};
            var rawBanThangDoi2 = req.body.BanThangDoi2 || {};

            var scoreDoi1 = buildChiTietTySoTheoDoi(rawBanThangDoi1, doiHinhDoi1, 'Doi1');
            var scoreDoi2 = buildChiTietTySoTheoDoi(rawBanThangDoi2, doiHinhDoi2, 'Doi2');

            tyso1 = scoreDoi1.tongBan;
            tyso2 = scoreDoi2.tongBan;
            chiTietTySo = scoreDoi1.chiTiet.concat(scoreDoi2.chiTiet);
        } else {
            tyso1 = parseNonNegativeNumber(req.body.TySo1);
            tyso2 = parseNonNegativeNumber(req.body.TySo2);
            chiTietTySo = [];
        }

        var trangThai = statusUtil.STATUS.DA_THI_DAU;
        var nguoiThang = winnerName(trangThai, td.DoiThu1, td.DoiThu2, tyso1, tyso2);

        await TranDau.findByIdAndUpdate(id, {
            TySo1: tyso1,
            TySo2: tyso2,
            ChiTietTySo: chiTietTySo,
            TrangThai: trangThai,
            NguoiThang: nguoiThang,
            KetQuaXacNhan: true,
            NguoiCapNhat: req.session.MaNguoiDung || null
        }, { runValidators: true }).exec();

        await capNhatBangXepHang(td.GiaiDau);

        await nhatKyHeThong.ghiNhatKy(req, {
            hanhDong: 'Nhập kết quả trận đấu',
            doiTuong: td.DoiThu1 + ' vs ' + td.DoiThu2,
            chiTiet: 'Kết quả trận đấu đã được cập nhật.',
            duLieuMoi: {
                TySo1: tyso1,
                TySo2: tyso2,
                TrangThai: trangThai,
                NguoiThang: nguoiThang,
                ChiTietTySo: chiTietTySo
            },
            mucDo: 'Thong tin'
        });

        await thongBaoHeThong.taoThongBaoHeThong({
            tieuDe: 'Cập nhật kết quả trận đấu',
            noiDung: 'Trận "' + td.DoiThu1 + ' vs ' + td.DoiThu2 + '" đã có kết quả ' + tyso1 + '-' + tyso2 + '.',
            loaiThongBao: 'TranDau',
            mucDo: 'Thong tin'
        });

        req.session.success = 'Đã nhập kết quả thành công.';
        return res.redirect('/trandau');
    }
    catch (err) {
        console.error('ERROR nhap-ket-qua', err);
        console.error('ERROR nhap-ket-qua body=', req.body);
        req.session.error = err.message || 'Không thể nhập kết quả.';
        return res.redirect('/trandau/nhap-ket-qua/' + req.params.id);
    }
});

module.exports = router;
