var express = require('express');
var router = express.Router();
var DangKyGiaiDau = require('../models/dangkygiaidau');
var GiaiDau = require('../models/giaidau');
var NguoiChoi = require('../models/nguoichoi');
var DoiTuyen = require('../models/doituyen');
var auth = require('../middlewares/auth');

function isTeamTournament(theThuc) {
    if (!theThuc) return false;
    return ['TEAM', 'doi', 'đội', 'Đồng đội', '2vs2', '4vs4'].includes(theThuc.toString().toUpperCase()) || 
           ['doi', 'đội'].includes(theThuc.toString().toLowerCase());
}

function toVietnameseApprovalStatus(status) {
    if (status === 'Da duyet') return 'Đã duyệt';
    if (status === 'Tu choi') return 'Từ chối';
    return 'Chờ duyệt';
}

function normalizeApprovalStatus(input) {
    if (!input) return 'Cho duyet';
    const s = input.toLowerCase();
    if (s.includes('da duyet')) return 'Da duyet';
    if (s.includes('tu choi')) return 'Tu choi';
    return 'Cho duyet';
}

// 1. DANH SÁCH ĐĂNG KÝ
router.get('/', auth.yeuCauDangNhap, async function (req, res) {
    try {
        const vaiTro = (req.session.VaiTro || req.session.QuyenHan || '').toLowerCase();
        const canManage = (vaiTro === 'admin' || vaiTro === 'nhanvien');

        let query = {};
        if (!canManage) {
            const player = await NguoiChoi.findOne({ TaiKhoan: req.session.MaNguoiDung }).exec();
            if (player) {
                if (player.DoiTuyen) query = { $or: [{ NguoiChoi: player._id }, { DoiTuyen: player.DoiTuyen }] };
                else query = { NguoiChoi: player._id };
            } else {
                query = { _id: null };
            }
        }

        const dk = await DangKyGiaiDau.find(query).populate('GiaiDau NguoiChoi DoiTuyen').sort({ createdAt: -1 }).exec();

        res.render('dangkygiaidau', {
            title: canManage ? 'Quản lý đơn đăng ký' : 'Đơn đăng ký của tôi',
            dangKySolo: dk.filter(i => i.GiaiDau && !isTeamTournament(i.GiaiDau.TheThuc)),
            dangKyTeam: dk.filter(i => i.GiaiDau && isTeamTournament(i.GiaiDau.TheThuc)),
            canManage: canManage,
            isAdmin: (vaiTro === 'admin'),
            toVietnameseApprovalStatus: toVietnameseApprovalStatus,
            session: req.session
        });
    } catch (err) { res.redirect('/'); }
});

// 2. GIAO DIỆN THÊM
router.get('/them', auth.yeuCauDangNhap, async function (req, res) {
    try {
        const tournamentId = req.query.tournament || ''; 
        const mode = req.query.mode || '';
        const gd = await GiaiDau.find({ KichHoat: true }).lean().exec();
        const nc = await NguoiChoi.find({ KichHoat: true }).lean().exec();
        const dt = await DoiTuyen.find({ KichHoat: true }).populate('ThanhVien').lean().exec();

        const currentPlayer = await NguoiChoi.findOne({ TaiKhoan: req.session.MaNguoiDung }).populate('DoiTuyen').lean().exec();
        const vaiTro = (req.session.VaiTro || req.session.QuyenHan || '').toLowerCase();
        
        const giaiDauMeta = gd.map(g => ({ id: g._id.toString(), isTeam: isTeamTournament(g.TheThuc) }));

        res.render('dangkygiaidau_them', {
            title: 'Thêm đăng ký giải đấu',
            giaidau: gd, nguoichoi: nc, doituyen: dt,
            giaiDauMeta: giaiDauMeta, currentPlayer: currentPlayer, tournamentId: tournamentId,
            isPlayer: (vaiTro === 'nguoi_choi' || vaiTro === 'nguoichoi'),
            canManage: (vaiTro === 'admin' || vaiTro === 'nhanvien'),
            mode: mode, session: req.session
        });
    } catch (err) { res.redirect('/dangkygiaidau'); }
});

// 3. LƯU ĐƠN (CHẶN HACK SLOT & CẤM THAM GIA NHIỀU GIẢI CÙNG LÚC NẾU CHƯA KẾT THÚC)
router.post('/them', auth.yeuCauDangNhap, async function (req, res) {
    try {
        const { GiaiDau: gdId, NguoiChoi: ncId, DoiTuyen: dtId } = req.body;
        const vaiTro = (req.session.VaiTro || req.session.QuyenHan || '').toLowerCase();
        const canManage = (vaiTro === 'admin' || vaiTro === 'nhanvien');
        
        const giaiDau = await GiaiDau.findById(gdId).exec();
        if (!giaiDau) throw new Error('Không tìm thấy giải đấu.');

        // ==========================================
        // BƯỚC BẢO MẬT 1: KIỂM TRA SỐ LƯỢNG SLOT
        // ==========================================
        const countSlot = await DangKyGiaiDau.countDocuments({
            GiaiDau: gdId, TrangThaiDuyet: { $ne: 'Tu choi' }
        });
        if (giaiDau.SoLuongToiDa && countSlot >= giaiDau.SoLuongToiDa) {
            throw new Error('Cảnh báo: Giải đấu này đã hết slot đăng ký!');
        }

        const laGiaiDoi = isTeamTournament(giaiDau.TheThuc);
        let data = { GiaiDau: gdId, NgayDangKy: new Date(), TrangThaiDuyet: 'Cho duyet' };

        // ==========================================
        // BƯỚC BẢO MẬT 2: CẤM THAM GIA NHIỀU GIẢI (CHỈ TÍNH GIẢI CHƯA KẾT THÚC)
        // ==========================================
        let queryCheckCheo = { TrangThaiDuyet: { $ne: 'Tu choi' } }; 
        
        if (canManage) {
            data.NguoiChoi = laGiaiDoi ? null : ncId;
            data.DoiTuyen = laGiaiDoi ? dtId : null;
            data.TrangThaiDuyet = normalizeApprovalStatus(req.body.TrangThaiDuyet);
            
            // Check theo ID Admin chọn
            if (laGiaiDoi) queryCheckCheo.DoiTuyen = dtId;
            else queryCheckCheo.NguoiChoi = ncId;
        } else {
            const player = await NguoiChoi.findOne({ TaiKhoan: req.session.MaNguoiDung }).populate('DoiTuyen').exec();
            if (!player) throw new Error('Không tìm thấy hồ sơ.');

            if (laGiaiDoi) {
                if (!player.DoiTuyen) throw new Error('Bạn chưa tham gia Đội tuyển nào!');
                if (player.DoiTuyen.ThanhVien.length < 4) throw new Error(`Đội "${player.DoiTuyen.TenDoi}" chưa đủ 4 thành viên!`);
                data.DoiTuyen = player.DoiTuyen._id;
            } else {
                data.NguoiChoi = player._id;
            }
            
            // Lấy TẤT CẢ các đơn của cá nhân NÀY HOẶC đội của người NÀY
            let orCond = [{ NguoiChoi: player._id }];
            if (player.DoiTuyen) orCond.push({ DoiTuyen: player.DoiTuyen._id });
            queryCheckCheo.$or = orCond;
        }

        // TÌM VÀ QUÉT CÁC ĐƠN ĐÃ NỘP (CÓ POPULATE ĐỂ LẤY TRẠNG THÁI GIẢI ĐẤU)
        const cacDonDaNop = await DangKyGiaiDau.find(queryCheckCheo).populate('GiaiDau').exec();
        
        let dangVuongGiaiKhac = false;
        
        for (let don of cacDonDaNop) {
            if (!don.GiaiDau) continue;
            
            // Kiểm tra trạng thái của giải đấu cũ
            let status = don.GiaiDau.TrangThai ? don.GiaiDau.TrangThai.toString().toLowerCase() : '';
            
            // Nếu giải đấu đó đã Đã kết thúc -> Bỏ qua, không tính là đụng lịch
            if (status.includes('da ket thuc') || status.includes('completed')) {
                continue; 
            }
            
            // Nếu chạy xuống tới đây nghĩa là đụng trúng 1 giải Đang/Sắp diễn ra
            dangVuongGiaiKhac = true;
            break;
        }

        // CHỐT CHẶN TỐI THƯỢNG
        if (dangVuongGiaiKhac) {
            throw new Error('Nghiệp vụ cấm: Bạn (hoặc Đội) đang có lịch thi đấu ở một giải khác. Hãy chờ giải đó KẾT THÚC hoặc rút đơn trước khi đăng ký giải mới!');
        }

        // BƯỚC BẢO MẬT 3: Chống đăng ký trùng 1 giải
        const checkQuery = { GiaiDau: gdId };
        if (laGiaiDoi) checkQuery.DoiTuyen = data.DoiTuyen;
        else checkQuery.NguoiChoi = data.NguoiChoi;
        const daTonTai = await DangKyGiaiDau.findOne(checkQuery).exec();
        if (daTonTai) throw new Error('Bạn (hoặc Đội của bạn) đã nộp đơn đăng ký giải này rồi!');

        // ==========================================
        // LƯU ĐƠN
        // ==========================================
        await DangKyGiaiDau.create(data);
        req.session.success = 'Gửi đơn đăng ký thành công! Chờ Admin duyệt nhé.';
        res.redirect('/dangkygiaidau');
    } catch (err) {
        req.session.error = err.message;
        res.redirect('/dangkygiaidau/them');
    }
});

// Các API khác giữ nguyên (Duyệt nhanh, Sửa, Xóa...)
router.post('/duyet-nhanh/:id', auth.yeuCauStaffHoacAdmin, async function(req, res) {
    try {
        await DangKyGiaiDau.findByIdAndUpdate(req.params.id, { TrangThaiDuyet: req.body.TrangThaiDuyet }).exec();
        req.session.success = req.body.TrangThaiDuyet === 'Da duyet' ? 'Đã duyệt đơn!' : 'Đã từ chối đơn!';
        res.redirect('/dangkygiaidau');
    } catch (err) { res.redirect('/dangkygiaidau'); }
});

router.get('/sua/:id', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    try {
        const dk = await DangKyGiaiDau.findById(req.params.id).exec();
        const gd = await GiaiDau.find({ KichHoat: true }).lean().exec();
        const nc = await NguoiChoi.find({ KichHoat: true }).lean().exec();
        const dt = await DoiTuyen.find({ KichHoat: true }).lean().exec();
        res.render('dangkygiaidau_sua', {
            title: 'Sửa đăng ký', dangkygiaidau: dk, giaidau: gd, nguoichoi: nc, doituyen: dt,
            giaiDauMeta: gd.map(g => ({ id: g._id.toString(), isTeam: isTeamTournament(g.TheThuc) })),
            session: req.session, canManage: true
        });
    } catch (err) { res.redirect('/dangkygiaidau'); }
});

router.post('/sua/:id', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    try {
        const { GiaiDau: gdId, NguoiChoi: ncId, DoiTuyen: dtId, TrangThaiDuyet } = req.body;
        const laGiaiDoi = isTeamTournament((await GiaiDau.findById(gdId).exec()).TheThuc);
        await DangKyGiaiDau.findByIdAndUpdate(req.params.id, {
            GiaiDau: gdId, NguoiChoi: laGiaiDoi ? null : ncId, DoiTuyen: laGiaiDoi ? dtId : null,
            TrangThaiDuyet: normalizeApprovalStatus(TrangThaiDuyet)
        }).exec();
        req.session.success = 'Cập nhật đăng ký thành công!';
        res.redirect('/dangkygiaidau');
    } catch (err) { res.redirect('back'); }
});

router.post('/xoa/:id', auth.yeuCauDangNhap, async function (req, res) {
    try {
        await DangKyGiaiDau.findByIdAndDelete(req.params.id).exec();
        req.session.success = 'Đã rút/xóa đơn đăng ký thành công.';
        res.redirect('/dangkygiaidau');
    } catch (err) { res.redirect('/dangkygiaidau'); }
});

module.exports = router;