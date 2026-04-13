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
    return (value || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function isTeamTournament(theThuc) {
    if (!theThuc) return false;
    var val = theThuc.toString().toLowerCase();
    return ['team', 'doi', 'đội', 'dong doi', '2vs2', '4vs4'].some(s => val.includes(s));
}

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
        if (errors.length > 0) {
            req.session.error = errors.join(' ');
            if (isUpdate) return res.redirect('/trandau/sua/' + (req.params.id || ''));
            return res.redirect('/trandau/them');
        }
        next();
    };
}

async function getApprovedParticipantsByTournament() {
    var regs = await DangKyGiaiDau.find().populate('GiaiDau').populate('NguoiChoi').populate('DoiTuyen').lean().exec();
    var map = {};
    regs.forEach(function (item) {
        if (!item.GiaiDau || !normalizeApprovalStatus(item.TrangThaiDuyet)) return;
        var gid = item.GiaiDau._id.toString();
        var isTeam = isTeamTournament(item.GiaiDau.TheThuc);
        if (!map[gid]) map[gid] = [];
        
        if (!isTeam && item.NguoiChoi) {
            map[gid].push({ id: item.NguoiChoi._id.toString(), name: item.NguoiChoi.HoVaTen, type: 'NguoiChoi' });
        }
        if (isTeam && item.DoiTuyen) {
            map[gid].push({ id: item.DoiTuyen._id.toString(), name: item.DoiTuyen.TenDoi, type: 'DoiTuyen' });
        }
    });
    return map;
}

async function capNhatBangXepHang(giaiDauId) {
    await BangXepHang.deleteMany({ GiaiDau: giaiDauId }).exec();
    var doneValues = statusUtil.valuesFor(statusUtil.STATUS.DA_THI_DAU);
    var dsTranDau = await TranDau.find({ GiaiDau: giaiDauId, TrangThai: { $in: doneValues } }).lean().exec();
    var bangTam = {};
    dsTranDau.forEach(function (item) {
        var doi1 = item.DoiThu1; var doi2 = item.DoiThu2;
        var tyso1 = item.TySo1 || 0; var tyso2 = item.TySo2 || 0;
        var loai = item.LoaiDoiTuongThiDau || (item.LoaiTran === 'TEAM' ? 'DoiTuyen' : 'NguoiChoi');
        if (!bangTam[doi1]) bangTam[doi1] = { GiaiDau: giaiDauId, DoiTuongThiDau: doi1, LoaiDoiTuong: loai, SoTran: 0, Thang: 0, Hoa: 0, Thua: 0, BanThang: 0, BanThua: 0, HieuSo: 0, Diem: 0, XepHang: 0 };
        if (!bangTam[doi2]) bangTam[doi2] = { GiaiDau: giaiDauId, DoiTuongThiDau: doi2, LoaiDoiTuong: loai, SoTran: 0, Thang: 0, Hoa: 0, Thua: 0, BanThang: 0, BanThua: 0, HieuSo: 0, Diem: 0, XepHang: 0 };
        bangTam[doi1].SoTran += 1; bangTam[doi2].SoTran += 1;
        bangTam[doi1].BanThang += tyso1; bangTam[doi1].BanThua += tyso2;
        bangTam[doi2].BanThang += tyso2; bangTam[doi2].BanThua += tyso1;
        bangTam[doi1].HieuSo += (tyso1 - tyso2); bangTam[doi2].HieuSo += (tyso2 - tyso1);
        if (tyso1 > tyso2) { bangTam[doi1].Thang += 1; bangTam[doi1].Diem += 3; bangTam[doi2].Thua += 1; } 
        else if (tyso2 > tyso1) { bangTam[doi2].Thang += 1; bangTam[doi2].Diem += 3; bangTam[doi1].Thua += 1; } 
        else { bangTam[doi1].Hoa += 1; bangTam[doi2].Hoa += 1; bangTam[doi1].Diem += 1; bangTam[doi2].Diem += 1; }
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
            id: item._id.toString(), ten: item.TenGiaiDau, theThuc: item.TheThuc,
            isTeam: isTeamTournament(item.TheThuc), participants: participantsMap[item._id.toString()] || []
        };
    });

    var tatCaDoiTuyen = await DoiTuyen.find().populate('ThanhVien', '_id HoVaTen').lean().exec();
    var teamMembersMap = {};
    tatCaDoiTuyen.forEach(function(team) {
        if (team.ThanhVien && team.ThanhVien.length > 0) {
            teamMembersMap[team._id.toString()] = team.ThanhVien.map(function(tv) {
                return { id: tv._id.toString(), name: tv.HoVaTen };
            });
        }
    });

    return { giaidau: gd, giaiDauMeta: giaiDauMeta, teamMembersMap: teamMembersMap };
}

async function loadDoiHinhByTeamId(teamId) {
    if (!teamId) return [];
    return NguoiChoi.find({ DoiTuyen: teamId, KichHoat: { $ne: false } }).sort({ HoVaTen: 1 }).select('_id HoVaTen').lean().exec();
}

function buildChiTietTySoTheoDoi(rawBanThang, doiHinh, benDoi) {
    var chiTiet = []; var tongBan = 0;
    doiHinh.forEach(function (item) {
        var key = item._id.toString(); var soBan = parseNonNegativeNumber(rawBanThang[key]);
        tongBan += soBan;
        chiTiet.push({ NguoiChoi: item._id, TenNguoiChoi: item.HoVaTen, DoiThu: benDoi, BanThang: soBan });
    });
    return { chiTiet: chiTiet, tongBan: tongBan };
}

function xacDinhLoaiTran(giaiDau, doiThu1, doiThu2) {
    if (doiThu1.type === 'DoiTuyen' && doiThu2.type === 'DoiTuyen') return { loaiTran: 'TEAM', loaiDoiTuong: 'DoiTuyen' };
    if (doiThu1.type === 'NguoiChoi' && doiThu2.type === 'NguoiChoi') return { loaiTran: isTeamTournament(giaiDau.TheThuc) ? 'TEAM' : '1vs1', loaiDoiTuong: 'NguoiChoi' };
    throw new Error('Hai đối thủ phải cùng loại đăng ký.');
}

// =================== CÁC API ROUTES ===================

router.get('/', auth.yeuCauDangNhap, async function (req, res) {
    var td = await TranDau.find().populate('GiaiDau').sort({ ThoiGianThiDau: -1 }).exec();
    var vaiTro = layVaiTro(req);
    var currentNguoiChoiId = '';
    var isNguoiChoiLogin = (vaiTro === 'nguoi_choi');

    if (vaiTro === 'nguoi_choi') {
        var maNguoiDung = req.session && req.session.MaNguoiDung ? req.session.MaNguoiDung.toString() : '';
        var nguoiChoiHienTai = await NguoiChoi.findOne({ TaiKhoan: maNguoiDung }).populate('DoiTuyen', '_id TenDoi').lean().exec();

        if (!nguoiChoiHienTai) {
            td = [];
        } else {
            var nguoiChoiId = nguoiChoiHienTai._id ? nguoiChoiHienTai._id.toString() : '';
            currentNguoiChoiId = nguoiChoiId;
            var doiTuyenId = nguoiChoiHienTai.DoiTuyen && nguoiChoiHienTai.DoiTuyen._id ? nguoiChoiHienTai.DoiTuyen._id.toString() : '';
            var tenNguoiChoi = normalizeText(nguoiChoiHienTai.HoVaTen);
            var tenDoi = normalizeText(nguoiChoiHienTai.DoiTuyen ? nguoiChoiHienTai.DoiTuyen.TenDoi : '');

            td = (td || []).filter(function (item) {
                var doiThu1Id = item && item.DoiThu1Id ? item.DoiThu1Id.toString() : '';
                var doiThu2Id = item && item.DoiThu2Id ? item.DoiThu2Id.toString() : '';
                var doiThu1Ten = normalizeText(item && item.DoiThu1 ? item.DoiThu1 : '');
                var doiThu2Ten = normalizeText(item && item.DoiThu2 ? item.DoiThu2 : '');

                var laTran1vs1 = (item && item.LoaiTran === '1vs1') || (item && item.LoaiDoiTuongThiDau === 'NguoiChoi');
                var laTranDoi = (item && item.LoaiTran === 'TEAM') || (item && item.LoaiDoiTuongThiDau === 'DoiTuyen');

                var trungNguoiTheoId = !!nguoiChoiId && (doiThu1Id === nguoiChoiId || doiThu2Id === nguoiChoiId);
                var trungNguoiTheoTen = !!tenNguoiChoi && (doiThu1Ten === tenNguoiChoi || doiThu2Ten === tenNguoiChoi);
                var trungDoiTheoId = !!doiTuyenId && (doiThu1Id === doiTuyenId || doiThu2Id === doiTuyenId);
                var trungDoiTheoTen = !!tenDoi && (doiThu1Ten === tenDoi || doiThu2Ten === tenDoi);

                if (laTran1vs1) return trungNguoiTheoId || trungNguoiTheoTen;
                if (laTranDoi) return trungDoiTheoId || trungDoiTheoTen;
                return trungNguoiTheoId || trungNguoiTheoTen || trungDoiTheoId || trungDoiTheoTen;
            });
        }
    }

    var trandau1vs1 = (td || []).filter(function (item) { return (item && (item.LoaiTran === '1vs1' || item.LoaiDoiTuongThiDau === 'NguoiChoi')); });
    var trandauDoi = (td || []).filter(function (item) { return (item && (item.LoaiTran === 'TEAM' || item.LoaiDoiTuongThiDau === 'DoiTuyen')); });

    res.render('trandau', {
        title: 'Trận đấu', trandau: td, trandau1vs1: trandau1vs1, trandauDoi: trandauDoi,
        canManage: (vaiTro === 'admin' || vaiTro === 'nhanvien'), isAdmin: vaiTro === 'admin',
        toVietnameseStatus: statusUtil.toVietnameseStatus,
        currentNguoiChoiId: currentNguoiChoiId,
        isNguoiChoiLogin: isNguoiChoiLogin
    });
});

router.get('/them', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    var formData = await buildTrandauFormData();
    var defaultLoaiDoiTuong = '';
    if (req.query && req.query.type) {
        if (req.query.type === 'DoiTuyen') defaultLoaiDoiTuong = 'DoiTuyen';
        else if (req.query.type === 'NguoiChoi') defaultLoaiDoiTuong = 'NguoiChoi';
    }
    res.render('trandau_them', {
        title: 'Thêm trận đấu', giaidau: formData.giaidau, giaiDauMeta: formData.giaiDauMeta,
        teamMembersMap: formData.teamMembersMap, defaultLoaiDoiTuong: defaultLoaiDoiTuong
    });
});

router.post('/them', auth.yeuCauStaffHoacAdmin, validateTranDauInput(false), async function (req, res) {
    try {
        var giaiDau = await GiaiDau.findById(req.body.GiaiDau).lean().exec();
        if (!giaiDau) { req.session.error = 'Không tìm thấy giải đấu.'; return res.redirect('/trandau/them'); }

        var formData = await buildTrandauFormData();
        var selectedMeta = formData.giaiDauMeta.find(function (x) { return x.id === req.body.GiaiDau.toString(); });
        var participants = selectedMeta ? selectedMeta.participants : [];

        var doiThu1 = participants.find(function (x) { return x.id === req.body.DoiThu1Id; });
        var doiThu2 = participants.find(function (x) { return x.id === req.body.DoiThu2Id; });

        if (!doiThu1 || !doiThu2) { req.session.error = 'Đối thủ không hợp lệ. Hãy chọn đúng tên Đội đã duyệt.'; return res.redirect('/trandau/them'); }
        if (doiThu1.id === doiThu2.id) { req.session.error = 'Hai đối thủ không được trùng nhau.'; return res.redirect('/trandau/them'); }

        var tyso1 = parseNonNegativeNumber(req.body.TySo1);
        var tyso2 = parseNonNegativeNumber(req.body.TySo2);
        var trangThai = statusUtil.normalizeStatus(req.body.TrangThai);
        if (tyso1 > 0 || tyso2 > 0) {
            trangThai = statusUtil.STATUS.DA_THI_DAU;
        }
        var loai = xacDinhLoaiTran(giaiDau, doiThu1, doiThu2);

        var danhSachKeoDau = [];
        if (loai.loaiTran === 'TEAM') {
            for (let i = 1; i <= 4; i++) {
                let p1Id = req.body['NguoiChoi1_Game' + i];
                let p2Id = req.body['NguoiChoi2_Game' + i];
                if (p1Id && p2Id) {
                    let p1Doc = await NguoiChoi.findById(p1Id).lean().exec();
                    let p2Doc = await NguoiChoi.findById(p2Id).lean().exec();
                    danhSachKeoDau.push({
                        GameSo: i,
                        NguoiChoi1Id: p1Id, TenNguoiChoi1: p1Doc ? p1Doc.HoVaTen : '',
                        NguoiChoi2Id: p2Id, TenNguoiChoi2: p2Doc ? p2Doc.HoVaTen : ''
                    });
                }
            }
        }

        var data = {
            GiaiDau: req.body.GiaiDau, LoaiTran: loai.loaiTran, LoaiDoiTuongThiDau: loai.loaiDoiTuong,
            DoiThu1Id: doiThu1.id, DoiThu2Id: doiThu2.id, VongDau: req.body.VongDau,
            DoiThu1: doiThu1.name, DoiThu2: doiThu2.name, ThoiGianThiDau: req.body.ThoiGianThiDau,
            TySo1: tyso1, TySo2: tyso2, ChiTietTySo: [], DanhSachKeoDau: danhSachKeoDau,
            NguoiThang: winnerName(trangThai, doiThu1.name, doiThu2.name, tyso1, tyso2),
            TrangThai: trangThai, NguoiTao: req.session.MaNguoiDung || null, NguoiCapNhat: req.session.MaNguoiDung || null
        };

        var tranDauMoi = await TranDau.create(data);
        await capNhatBangXepHang(req.body.GiaiDau);
        req.session.success = 'Đã thêm trận đấu thành công.';
        return res.redirect('/trandau');
    } catch (err) {
        req.session.error = err.message || 'Không thể thêm trận đấu.';
        return res.redirect('/trandau/them');
    }
});

router.get('/sua/:id', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    var td = await TranDau.findById(req.params.id).lean().exec();
    if (!td) { req.session.error = 'Không tìm thấy trận đấu.'; return res.redirect('/trandau'); }
    var formData = await buildTrandauFormData();
    res.render('trandau_sua', { title: 'Sửa trận đấu', trandau: td, giaidau: formData.giaidau, giaiDauMeta: formData.giaiDauMeta, teamMembersMap: formData.teamMembersMap });
});

router.post('/sua/:id', auth.yeuCauStaffHoacAdmin, validateTranDauInput(true), async function (req, res) {
    try {
        var id = req.params.id;
        var tranDauCu = await TranDau.findById(id).exec();
        var giaiDau = await GiaiDau.findById(req.body.GiaiDau).lean().exec();
        var formData = await buildTrandauFormData();
        var selectedMeta = formData.giaiDauMeta.find(function (x) { return x.id === req.body.GiaiDau.toString(); });
        var participants = selectedMeta ? selectedMeta.participants : [];

        var doiThu1 = participants.find(function (x) { return String(x.id) === String(req.body.DoiThu1Id).trim(); });
        var doiThu2 = participants.find(function (x) { return String(x.id) === String(req.body.DoiThu2Id).trim(); });

        var tyso1 = parseNonNegativeNumber(req.body.TySo1);
        var tyso2 = parseNonNegativeNumber(req.body.TySo2);
        var trangThai = statusUtil.normalizeStatus(req.body.TrangThai);
        if (tyso1 > 0 || tyso2 > 0) {
            trangThai = statusUtil.STATUS.DA_THI_DAU;
        }
        var loai = xacDinhLoaiTran(giaiDau, doiThu1, doiThu2);

        var danhSachKeoDau = [];
        if (loai.loaiTran === 'TEAM') {
            for (let i = 1; i <= 4; i++) {
                let p1Id = req.body['NguoiChoi1_Game' + i];
                let p2Id = req.body['NguoiChoi2_Game' + i];
                if (p1Id && p2Id) {
                    let p1Doc = await NguoiChoi.findById(p1Id).lean().exec();
                    let p2Doc = await NguoiChoi.findById(p2Id).lean().exec();
                    danhSachKeoDau.push({
                        GameSo: i, NguoiChoi1Id: p1Id, TenNguoiChoi1: p1Doc ? p1Doc.HoVaTen : '',
                        NguoiChoi2Id: p2Id, TenNguoiChoi2: p2Doc ? p2Doc.HoVaTen : ''
                    });
                }
            }
        }

        var data = {
            GiaiDau: req.body.GiaiDau, LoaiTran: loai.loaiTran, LoaiDoiTuongThiDau: loai.loaiDoiTuong,
            DoiThu1Id: doiThu1.id, DoiThu2Id: doiThu2.id, VongDau: req.body.VongDau,
            DoiThu1: doiThu1.name, DoiThu2: doiThu2.name, ThoiGianThiDau: req.body.ThoiGianThiDau,
            TySo1: tyso1, TySo2: tyso2, ChiTietTySo: loai.loaiTran === 'TEAM' ? (tranDauCu.ChiTietTySo || []) : [],
            DanhSachKeoDau: (danhSachKeoDau.length > 0) ? danhSachKeoDau : tranDauCu.DanhSachKeoDau,
            NguoiThang: winnerName(trangThai, doiThu1.name, doiThu2.name, tyso1, tyso2),
            TrangThai: trangThai, NguoiCapNhat: req.session.MaNguoiDung || null
        };

        await TranDau.findByIdAndUpdate(id, data, { runValidators: true }).exec();
        await capNhatBangXepHang(req.body.GiaiDau);
        req.session.success = 'Đã cập nhật trận đấu thành công.';
        return res.redirect('/trandau');
    } catch (err) { res.redirect('/trandau/sua/' + req.params.id); }
});

router.get('/xoa/:id', auth.yeuCauAdmin, async function (req, res) {
    try {
        var id = req.params.id;
        var td = await TranDau.findById(id).exec();
        if (!td) { req.session.error = 'Không tìm thấy trận đấu.'; return res.redirect('/trandau'); }
        if (td.KetQuaXacNhan || statusUtil.isDoneStatus(td.TrangThai)) { req.session.error = 'Kết quả trận này đã chốt, không thể nhập lại.'; return res.redirect('/trandau'); }
        await TranDau.findByIdAndDelete(id).exec();
        await capNhatBangXepHang(td.GiaiDau);
        req.session.success = 'Đã xóa trận đấu.';
        return res.redirect('/trandau');
    } catch (err) { res.redirect('/trandau'); }
});


// ================================================================
// TRẢ LẠI API GOOGLE CALENDAR GỐC (BỎ LEAN ĐỂ KHÔNG BỊ LỖI THỜI GIAN)
// ================================================================

router.get('/mo-lich/:id', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    try {
        var td = await TranDau.findById(req.params.id).populate('GiaiDau').exec();
        if (!td) {
            req.session.error = 'Khong tim thay tran dau.';
            return res.redirect('/trandau');
        }

        if (!td.ThoiGianThiDau) {
            req.session.error = 'Tran dau chua co thoi gian thi dau.';
            return res.redirect('/trandau');
        }

        if (!td.GoogleCalendarLink) {
            try {
                var evt = await googleCalendar.taoSuKienTranDau(td, td.GiaiDau ? td.GiaiDau.TenGiaiDau : null);
                td.GoogleCalendarEventId = (evt && evt.id) ? evt.id : (td.GoogleCalendarEventId || null);
                td.GoogleCalendarLink = (evt && evt.htmlLink) ? evt.htmlLink : (td.GoogleCalendarLink || null);
                await td.save();
            } catch (apiErr) {
                console.error('ERROR mo-lich:', apiErr && apiErr.message ? apiErr.message : apiErr);
                return res.redirect(googleCalendar.buildCreateEventUrl(td, td.GiaiDau ? td.GiaiDau.TenGiaiDau : null));
            }
        }

        return res.redirect(googleCalendar.buildDayViewUrl(td.ThoiGianThiDau));
    }
    catch (err) {
        console.log(err);
        req.session.error = 'Khong the mo lich.';
        return res.redirect('/trandau');
    }
});

router.get('/xuat-lich/:id', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    try {
        var td = await TranDau.findById(req.params.id).populate('GiaiDau').exec();
        if (!td) {
            req.session.error = 'Khong tim thay tran dau.';
            return res.redirect('/trandau');
        }

        if (!td.ThoiGianThiDau) {
            req.session.error = 'Tran dau chua co thoi gian de xuat lich.';
            return res.redirect('/trandau');
        }

        if (td.GoogleCalendarLink || td.GoogleCalendarEventId) {
            req.session.success = 'Tran dau nay da duoc xuat lich truoc do.';
            return res.redirect(googleCalendar.buildDayViewUrl(td.ThoiGianThiDau));
        }

        try {
            var evt = await googleCalendar.taoSuKienTranDau(td, td.GiaiDau ? td.GiaiDau.TenGiaiDau : null);
            td.GoogleCalendarEventId = (evt && evt.id) ? evt.id : null;
            td.GoogleCalendarLink = (evt && evt.htmlLink) ? evt.htmlLink : null;
            await td.save();

            req.session.success = 'Da xuat lich sang Google Calendar.';
            return res.redirect(googleCalendar.buildDayViewUrl(td.ThoiGianThiDau));
        } catch (apiErr) {
            console.error('ERROR xuat-lich:', apiErr && apiErr.message ? apiErr.message : apiErr);
            return res.redirect(googleCalendar.buildCreateEventUrl(td, td.GiaiDau ? td.GiaiDau.TenGiaiDau : null));
        }
    }
    catch (err) {
        console.log(err);
        req.session.error = 'Khong the xuat lich.';
        return res.redirect('/trandau');
    }
});
// ================================================================

router.get('/chi-tiet/:id', auth.yeuCauDangNhap, async function (req, res) {
    try {
        var td = await TranDau.findById(req.params.id).populate('GiaiDau').lean().exec();
        if (!td) {
            req.session.error = 'Không tìm thấy trận đấu.';
            return res.redirect('/trandau');
        }

        var vaiTro = layVaiTro(req);
        if (vaiTro === 'nguoi_choi') {
            var maNguoiDung = req.session && req.session.MaNguoiDung ? req.session.MaNguoiDung.toString() : '';
            var nguoiChoiHienTai = await NguoiChoi.findOne({ TaiKhoan: maNguoiDung }).populate('DoiTuyen', '_id TenDoi').lean().exec();
            if (!nguoiChoiHienTai) {
                req.session.error = 'Bạn không có quyền xem trận này.';
                return res.redirect('/trandau');
            }

            var nguoiChoiId = nguoiChoiHienTai._id ? nguoiChoiHienTai._id.toString() : '';
            var doiTuyenId = nguoiChoiHienTai.DoiTuyen && nguoiChoiHienTai.DoiTuyen._id ? nguoiChoiHienTai.DoiTuyen._id.toString() : '';
            var tenNguoiChoi = normalizeText(nguoiChoiHienTai.HoVaTen);
            var tenDoi = normalizeText(nguoiChoiHienTai.DoiTuyen ? nguoiChoiHienTai.DoiTuyen.TenDoi : '');

            var doiThu1Id = td && td.DoiThu1Id ? td.DoiThu1Id.toString() : '';
            var doiThu2Id = td && td.DoiThu2Id ? td.DoiThu2Id.toString() : '';
            var doiThu1Ten = normalizeText(td && td.DoiThu1 ? td.DoiThu1 : '');
            var doiThu2Ten = normalizeText(td && td.DoiThu2 ? td.DoiThu2 : '');

            var laTran1vs1 = (td && td.LoaiTran === '1vs1') || (td && td.LoaiDoiTuongThiDau === 'NguoiChoi');
            var laTranDoi = (td && td.LoaiTran === 'TEAM') || (td && td.LoaiDoiTuongThiDau === 'DoiTuyen');

            var trungNguoiTheoId = !!nguoiChoiId && (doiThu1Id === nguoiChoiId || doiThu2Id === nguoiChoiId);
            var trungNguoiTheoTen = !!tenNguoiChoi && (doiThu1Ten === tenNguoiChoi || doiThu2Ten === tenNguoiChoi);
            var trungDoiTheoId = !!doiTuyenId && (doiThu1Id === doiTuyenId || doiThu2Id === doiTuyenId);
            var trungDoiTheoTen = !!tenDoi && (doiThu1Ten === tenDoi || doiThu2Ten === tenDoi);

            var duocXem = false;
            if (laTran1vs1) duocXem = trungNguoiTheoId || trungNguoiTheoTen;
            else if (laTranDoi) duocXem = trungDoiTheoId || trungDoiTheoTen;
            else duocXem = trungNguoiTheoId || trungNguoiTheoTen || trungDoiTheoId || trungDoiTheoTen;

            if (!duocXem) {
                req.session.error = 'Bạn không có quyền xem trận này.';
                return res.redirect('/trandau');
            }
        }

        var laTranDoi = (td && (td.LoaiTran === 'TEAM' || td.LoaiDoiTuongThiDau === 'DoiTuyen'));
        var chiTietKeoDau = [];

        if (laTranDoi) {
            var mapBanThang = {};
            (td.ChiTietTySo || []).forEach(function (ct) {
                if (!ct || !ct.NguoiChoi) return;
                mapBanThang[ct.NguoiChoi.toString()] = Number(ct.BanThang || 0);
            });

            chiTietKeoDau = (td.DanhSachKeoDau || []).map(function (k) {
                var p1Id = k && k.NguoiChoi1Id ? k.NguoiChoi1Id.toString() : '';
                var p2Id = k && k.NguoiChoi2Id ? k.NguoiChoi2Id.toString() : '';
                return {
                    GameSo: k && k.GameSo ? k.GameSo : null,
                    TenNguoiChoi1: k && k.TenNguoiChoi1 ? k.TenNguoiChoi1 : 'Đội 1',
                    TenNguoiChoi2: k && k.TenNguoiChoi2 ? k.TenNguoiChoi2 : 'Đội 2',
                    TySo1: mapBanThang[p1Id] || 0,
                    TySo2: mapBanThang[p2Id] || 0
                };
            });
        }

        return res.render('trandau_chitiet', {
            title: 'Chi tiết trận đấu',
            trandau: td,
            laTranDoi: laTranDoi,
            chiTietKeoDau: chiTietKeoDau,
            toVietnameseStatus: statusUtil.toVietnameseStatus
        });
    } catch (err) {
        req.session.error = 'Không thể xem chi tiết trận đấu.';
        return res.redirect('/trandau');
    }
});

// ================================================================

router.get('/nhap-ket-qua/:id', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    try {
        var td = await TranDau.findById(req.params.id).populate('GiaiDau').lean().exec();
        var isTeamMatch = td.LoaiDoiTuongThiDau === 'DoiTuyen';
        var doiHinhDoi1 = isTeamMatch ? await loadDoiHinhByTeamId(td.DoiThu1Id) : [];
        var doiHinhDoi2 = isTeamMatch ? await loadDoiHinhByTeamId(td.DoiThu2Id) : [];
        var isLocked = !!td.KetQuaXacNhan || statusUtil.isDoneStatus(td.TrangThai);

        var banThangDoi1Map = {};
        var banThangDoi2Map = {};
        (td.ChiTietTySo || []).forEach(function (item) {
            if (!item || !item.NguoiChoi) return;
            var key = item.NguoiChoi.toString();
            var soBan = parseNonNegativeNumber(item.BanThang);
            if ((item.DoiThu || '') === 'Doi1') banThangDoi1Map[key] = soBan;
            if ((item.DoiThu || '') === 'Doi2') banThangDoi2Map[key] = soBan;
        });

        return res.render('trandau_nhapketqua', {
            title: 'Nhập kết quả',
            trandau: td,
            isTeamMatch: isTeamMatch,
            doiHinhDoi1: doiHinhDoi1,
            doiHinhDoi2: doiHinhDoi2,
            banThangDoi1Map: banThangDoi1Map,
            banThangDoi2Map: banThangDoi2Map,
            toVietnameseStatus: statusUtil.toVietnameseStatus,
            isLocked: isLocked
        });
    } catch (err) { res.redirect('/trandau'); }
});

router.post('/nhap-ket-qua/:id', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    try {
        var id = req.params.id;
        var td = await TranDau.findById(id).exec();
        if (!td) { req.session.error = 'Không tìm thấy trận đấu.'; return res.redirect('/trandau'); }
        if (td.KetQuaXacNhan || statusUtil.isDoneStatus(td.TrangThai)) { req.session.error = 'Kết quả trận này đã chốt, không thể nhập lại.'; return res.redirect('/trandau'); }
        var tyso1 = 0; var tyso2 = 0; var chiTietTySo = [];

        if (td.LoaiDoiTuongThiDau === 'DoiTuyen') {
            var doiHinhDoi1 = await loadDoiHinhByTeamId(td.DoiThu1Id);
            var doiHinhDoi2 = await loadDoiHinhByTeamId(td.DoiThu2Id);
            var scoreDoi1 = buildChiTietTySoTheoDoi(req.body.BanThangDoi1 || {}, doiHinhDoi1, 'Doi1');
            var scoreDoi2 = buildChiTietTySoTheoDoi(req.body.BanThangDoi2 || {}, doiHinhDoi2, 'Doi2');
            tyso1 = scoreDoi1.tongBan; tyso2 = scoreDoi2.tongBan;
            chiTietTySo = scoreDoi1.chiTiet.concat(scoreDoi2.chiTiet);
        } else {
            tyso1 = parseNonNegativeNumber(req.body.TySo1); tyso2 = parseNonNegativeNumber(req.body.TySo2);
        }
        var trangThai = statusUtil.STATUS.DA_THI_DAU;
        var nguoiThang = winnerName(trangThai, td.DoiThu1, td.DoiThu2, tyso1, tyso2);
        await TranDau.findByIdAndUpdate(id, { TySo1: tyso1, TySo2: tyso2, ChiTietTySo: chiTietTySo, TrangThai: trangThai, NguoiThang: nguoiThang, KetQuaXacNhan: true }, { runValidators: true }).exec();
        await capNhatBangXepHang(td.GiaiDau);
        req.session.success = 'Đã nhập kết quả thành công.';
        return res.redirect('/trandau');
    } catch (err) { res.redirect('/trandau/nhap-ket-qua/' + req.params.id); }
});

module.exports = router;











