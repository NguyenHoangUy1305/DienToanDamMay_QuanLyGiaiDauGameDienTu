var express = require('express');
var router = express.Router();
var DoiTuyen = require('../models/doituyen');
var NguoiChoi = require('../models/nguoichoi'); // Bắt buộc gọi model Người Chơi
var auth = require('../middlewares/auth');
var nhatKyHeThong = require('../services/nhatkyhethong');
var thongBaoHeThong = require('../services/thongbao');

function layVaiTro(req) {
    return (req.session && (req.session.VaiTro || req.session.QuyenHan)) || 'khach';
}

// GET: Danh sách đội tuyển
router.get('/', auth.yeuCauDangNhap, async function (req, res) {
    try {
        // Phải móc (populate) tên Thành Viên và Người Chờ Duyệt ra
        var dt = await DoiTuyen.find()
            .populate('ThanhVien', 'HoVaTen')
            .populate('ThanhVienChoDuyet', 'HoVaTen')
            .sort({ TenDoi: 1 })
            .exec();
            
        var vaiTro = layVaiTro(req).toLowerCase();
        var canManage = (vaiTro === 'admin' || vaiTro === 'nhanvien');
        var isAdmin = (vaiTro === 'admin');

        // BẮT BUỘC: Lấy thông tin người chơi đang đăng nhập để truyền qua UI
        var currentPlayer = null;
        if (!canManage) {
            currentPlayer = await NguoiChoi.findOne({ TaiKhoan: req.session.MaNguoiDung }).exec();
        }

        res.render('doituyen', {
            title: 'Đội tuyển', 
            doituyen: dt,
            canManage: canManage,
            isAdmin: isAdmin,
            currentPlayer: currentPlayer, // NẾU THIẾU DÒNG NÀY LÀ UI KHÔNG HIỆN NÚT
            session: req.session
        });
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});

// GET & POST: Thêm đội tuyển
router.get('/them', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    res.render('doituyen_them', { title: 'Thêm đội tuyển' });
});

router.post('/them', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    try {
        var data = {
            TenDoi: req.body.TenDoi, TruongDoi: req.body.TruongDoi, SoDienThoai: req.body.SoDienThoai,
            Email: req.body.Email, GhiChu: req.body.GhiChu, KichHoat: req.body.KichHoat ? true : false
        };
        var doiTuyenMoi = await DoiTuyen.create(data);
        await nhatKyHeThong.ghiNhatKy(req, {
            hanhDong: 'Thêm đội tuyển', doiTuong: doiTuyenMoi.TenDoi,
            chiTiet: (doiTuyenMoi.TruongDoi || 'Đội mới') + ' đã được thêm.', mucDo: 'Thong tin'
        });
        req.session.success = 'Đã thêm đội tuyển thành công.';
        return res.redirect('/doituyen');
    } catch (err) {
        req.session.error = 'Không thể thêm đội tuyển.';
        return res.redirect('/doituyen/them');
    }
});

// ========================================================
// LOGIC: NGƯỜI CHƠI XIN GIA NHẬP ĐỘI
// ========================================================
router.post('/xin-gia-nhap/:id', auth.yeuCauDangNhap, async function (req, res) {
    try {
        const teamId = req.params.id;
        const player = await NguoiChoi.findOne({ TaiKhoan: req.session.MaNguoiDung }).exec();
        
        if (!player) throw new Error('Không tìm thấy hồ sơ người chơi.');
        if (player.DoiTuyen) throw new Error('Bạn đã thuộc một đội khác, phải rời đội cũ trước!');

        const team = await DoiTuyen.findById(teamId).exec();
        if (!team) throw new Error('Không tìm thấy đội tuyển.');
        
        if (team.ThanhVien && team.ThanhVien.length >= 4) throw new Error('Đội này đã đủ 4 thành viên chính thức!');
        if (team.ThanhVienChoDuyet && team.ThanhVienChoDuyet.includes(player._id)) {
            throw new Error('Bạn đã gửi yêu cầu cho đội này rồi, đang chờ Admin duyệt!');
        }

        // Đẩy vào mảng Chờ duyệt
        await DoiTuyen.findByIdAndUpdate(teamId, { $addToSet: { ThanhVienChoDuyet: player._id } });
        req.session.success = 'Đã gửi yêu cầu gia nhập! Chờ Admin duyệt nhé.';
        res.redirect('/doituyen');
    } catch (err) {
        req.session.error = err.message;
        res.redirect('/doituyen');
    }
});

// ========================================================
// LOGIC: ADMIN DUYỆT THÀNH VIÊN VÀO ĐỘI (ĐÃ FIX LỖI 404 /back)
// ========================================================
router.post('/duyet-thanh-vien/:teamId/:userId', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    try {
        const { teamId, userId } = req.params;
        const team = await DoiTuyen.findById(teamId).exec();
        
        if (!team) throw new Error('Đội không tồn tại.');
        if (team.ThanhVien && team.ThanhVien.length >= 4) throw new Error('Đội đã đủ 4 người, không thể duyệt thêm!');

        // Bốc từ Phòng chờ -> Đẩy qua Phòng chính
        await DoiTuyen.findByIdAndUpdate(teamId, {
            $pull: { ThanhVienChoDuyet: userId },
            $addToSet: { ThanhVien: userId }
        });
        
        // Cập nhật lại teamId cho Người chơi
        await NguoiChoi.findByIdAndUpdate(userId, { DoiTuyen: teamId });

        req.session.success = 'Đã duyệt thành viên vào đội thành công!';
        res.redirect('/doituyen'); // Thay 'back' thành đường dẫn gốc
    } catch (err) {
        req.session.error = err.message;
        res.redirect('/doituyen'); // Thay 'back' thành đường dẫn gốc
    }
});

// ========================================================
// LOGIC: ADMIN TỪ CHỐI THÀNH VIÊN (ĐÃ FIX LỖI 404 /back)
// ========================================================
router.post('/tu-choi-thanh-vien/:teamId/:userId', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    try {
        // Chỉ việc xóa khỏi mảng Chờ duyệt
        await DoiTuyen.findByIdAndUpdate(req.params.teamId, {
            $pull: { ThanhVienChoDuyet: req.params.userId }
        });
        req.session.success = 'Đã từ chối yêu cầu gia nhập.';
        res.redirect('/doituyen'); // Thay 'back' thành đường dẫn gốc
    } catch (err) { 
        res.redirect('/doituyen'); // Thay 'back' thành đường dẫn gốc
    }
});


// GET & POST: Sửa và Xóa đội tuyển
router.get('/sua/:id', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    var dt = await DoiTuyen.findById(req.params.id).exec();
    if (!dt) return res.redirect('/doituyen');
    res.render('doituyen_sua', { title: 'Sửa đội tuyển', doituyen: dt });
});

router.post('/sua/:id', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    try {
        await DoiTuyen.findByIdAndUpdate(req.params.id, req.body).exec();
        req.session.success = 'Đã cập nhật đội tuyển thành công.';
        res.redirect('/doituyen');
    } catch (err) { res.redirect('/doituyen/sua/' + req.params.id); }
});

router.post('/xoa/:id', auth.yeuCauAdmin, async function (req, res) {
    try {
        await DoiTuyen.findByIdAndDelete(req.params.id).exec();
        req.session.success = 'Đã xóa đội tuyển thành công.';
        res.redirect('/doituyen');
    } catch (err) { res.redirect('/doituyen'); }
});

module.exports = router;