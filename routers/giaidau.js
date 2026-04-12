var express = require('express');
var router = express.Router();
var GiaiDau = require('../models/giaidau');
var DangKyGiaiDau = require('../models/dangkygiaidau'); 
var NguoiChoi = require('../models/nguoichoi');        
var auth = require('../middlewares/auth');
var nhatKyHeThong = require('../services/nhatkyhethong');

// --- HELPER FUNCTIONS ---
function isTeamTournament(theThuc) {
    if (!theThuc) return false;
    var val = theThuc.toString().toLowerCase();
    return ['team', 'doi', 'đội', 'dong doi', '2vs2', '4vs4'].some(s => val.includes(s));
}

function toVietnameseTournamentType(theThuc) {
    if (['1vs1', '1 vs 1', 'solo'].includes(theThuc?.toString().toLowerCase())) return 'Cá nhân 1vs1';
    if (isTeamTournament(theThuc)) return 'Thi đấu Đội';
    return theThuc || 'Chưa xác định';
}

function toVietnameseTournamentStatus(status) {
    if (!status) return 'Không xác định';
    var s = status.toString().toLowerCase();
    if (s.includes('pending') || s.includes('sap dien ra') || s.includes('sắp diễn ra')) return 'Sắp diễn ra';
    if (s.includes('ongoing') || s.includes('dang dien ra') || s.includes('đang diễn ra')) return 'Đang diễn ra';
    if (s.includes('completed') || s.includes('da ket thuc') || s.includes('đã kết thúc')) return 'Đã kết thúc';
    return status;
}

function layVaiTro(req) {
    return (req.session && (req.session.VaiTro || req.session.QuyenHan)) || 'khach';
}

// --- ROUTES ---

// 1. GET: Danh sách giải đấu (ĐẾM SLOT & TÌM GIẢI ĐÃ ĐĂNG KÝ)
router.get('/', auth.yeuCauDangNhap, async function (req, res) {
    try {
        var gd = await GiaiDau.find().sort({ NgayBatDau: -1 }).lean().exec();
        var vaiTro = layVaiTro(req).toLowerCase();
        var isPlayer = (vaiTro === 'nguoi_choi' || vaiTro === 'nguoichoi');

        let registeredTournamentIds = [];
        let hasRegistered1vs1 = false; // Biến kiểm tra
        let hasRegisteredTeam = false; // Biến kiểm tra
        
        if (isPlayer) {
            const player = await NguoiChoi.findOne({ TaiKhoan: req.session.MaNguoiDung }).exec();
            if (player) {
                let query = { $or: [{ NguoiChoi: player._id }] };
                if (player.DoiTuyen) {
                    query.$or.push({ DoiTuyen: player.DoiTuyen });
                }
                query.TrangThaiDuyet = { $ne: 'Tu choi' }; // Bỏ qua đơn đã bị hủy

                const regs = await DangKyGiaiDau.find(query).populate('GiaiDau').exec();
                
                regs.forEach(r => {
                    if (r.GiaiDau) {
                        // ===============================================
                        // BƯỚC THÔNG MINH: KIỂM TRA TRẠNG THÁI GIẢI ĐẤU
                        // ===============================================
                        let status = r.GiaiDau.TrangThai ? r.GiaiDau.TrangThai.toString().toLowerCase() : '';
                        
                        // Nếu giải đấu cũ đã "Đã kết thúc" hoặc "Completed" -> THA CHO NÓ, BỎ QUA!
                        if (status.includes('da ket thuc') || status.includes('completed')) {
                            return; // Lệnh return trong forEach có tác dụng như continue
                        }

                        // Nếu giải vẫn đang đá hoặc sắp đá thì mới khóa UI
                        registeredTournamentIds.push(r.GiaiDau._id.toString());
                        if (isTeamTournament(r.GiaiDau.TheThuc)) {
                            hasRegisteredTeam = true;
                        } else {
                            hasRegistered1vs1 = true;
                        }
                    }
                });
            }
        }

        // ĐẾM SLOT
        for (let i = 0; i < gd.length; i++) {
            let count = await DangKyGiaiDau.countDocuments({
                GiaiDau: gd[i]._id,
                TrangThaiDuyet: { $ne: 'Tu choi' }
            });
            gd[i].soLuongDaDangKy = count; 
        }

        res.render('giaidau', {
            title: 'Giải đấu FC Online',
            giaidau1vs1: gd.filter(i => !isTeamTournament(i.TheThuc)),
            giaidauDoi: gd.filter(i => isTeamTournament(i.TheThuc)),
            canManage: (vaiTro === 'admin' || vaiTro === 'nhanvien'),
            isAdmin: vaiTro === 'admin',
            session: req.session,
            toVietnameseTournamentType: toVietnameseTournamentType,
            toVietnameseTournamentStatus: toVietnameseTournamentStatus,
            registeredTournamentIds: registeredTournamentIds,
            hasRegistered1vs1: hasRegistered1vs1, // Truyền biến ra
            hasRegisteredTeam: hasRegisteredTeam  // Truyền biến ra
        });
    } catch (err) {
        res.status(500).send("Lỗi tải danh sách giải đấu.");
    }
});

// Các hàm Thêm, Sửa, Xóa giữ nguyên
router.get('/them', auth.yeuCauStaffHoacAdmin, (req, res) => {
    res.render('giaidau_them', { title: 'Thêm giải đấu mới' });
});

router.post('/them', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    try {
        var giaiDauMoi = await GiaiDau.create(req.body);
        req.session.success = 'Tạo giải đấu thành công!';
        res.redirect('/giaidau');
    } catch (err) {
        req.session.error = 'Lỗi: ' + err.message;
        res.redirect('/giaidau/them');
    }
});

router.get('/sua/:id', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    try {
        var gd = await GiaiDau.findById(req.params.id).exec();
        if (!gd) {
            req.session.error = 'Không tìm thấy giải đấu này!';
            return res.redirect('/giaidau');
        }
        res.render('giaidau_sua', { title: 'Chỉnh sửa giải đấu', giaidau: gd });
    } catch (err) {
        res.redirect('/giaidau');
    }
});

router.post('/sua/:id', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    try {
        await GiaiDau.findByIdAndUpdate(req.params.id, req.body).exec();
        req.session.success = 'Cập nhật giải đấu thành công!';
        res.redirect('/giaidau');
    } catch (err) {
        req.session.error = 'Lỗi cập nhật: ' + err.message;
        res.redirect('/giaidau/sua/' + req.params.id);
    }
});

router.post('/xoa/:id', auth.yeuCauAdmin, async function (req, res) {
    try {
        await GiaiDau.findByIdAndDelete(req.params.id).exec();
        req.session.success = 'Đã xóa giải đấu.';
        res.redirect('/giaidau');
    } catch (err) {
        res.redirect('/giaidau');
    }
});

module.exports = router;