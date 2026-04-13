var express = require('express');
var router = express.Router();
var DoiTuyen = require('../models/doituyen');
var NguoiChoi = require('../models/nguoichoi');
var auth = require('../middlewares/auth');
var nhatKyHeThong = require('../services/nhatkyhethong');
var thongBaoHeThong = require('../services/thongbao');

function layVaiTro(req) {
    return (req.session && (req.session.VaiTro || req.session.QuyenHan)) || 'khach';
}

router.get('/', auth.yeuCauDangNhap, async function (req, res) {
    try {
        var dt = await DoiTuyen.find()
            .populate('ThanhVien', 'HoVaTen')
            .populate('ThanhVienChoDuyet', 'HoVaTen')
            .sort({ TenDoi: 1 })
            .exec();

        var vaiTro = layVaiTro(req).toLowerCase();
        var canManage = (vaiTro === 'admin' || vaiTro === 'nhanvien');
        var isAdmin = (vaiTro === 'admin');

        var currentPlayer = null;
        var pendingTeamId = '';

        if (!canManage) {
            currentPlayer = await NguoiChoi.findOne({ TaiKhoan: req.session.MaNguoiDung }).exec();

            if (currentPlayer) {
                var dsDangCho = await DoiTuyen.find({ ThanhVienChoDuyet: currentPlayer._id })
                    .sort({ updatedAt: -1 })
                    .select('_id TenDoi')
                    .lean()
                    .exec();

                if (dsDangCho.length > 0) {
                    pendingTeamId = dsDangCho[0]._id.toString();

                    // Tự làm sạch dữ liệu cũ nếu người chơi bị treo chờ duyệt ở nhiều đội.
                    if (dsDangCho.length > 1) {
                        var idsCanXoa = dsDangCho.slice(1).map(function (x) { return x._id; });
                        await DoiTuyen.updateMany(
                            { _id: { $in: idsCanXoa } },
                            { $pull: { ThanhVienChoDuyet: currentPlayer._id } }
                        ).exec();

                        // Cập nhật lại dữ liệu hiển thị sau khi làm sạch.
                        dt = await DoiTuyen.find()
                            .populate('ThanhVien', 'HoVaTen')
                            .populate('ThanhVienChoDuyet', 'HoVaTen')
                            .sort({ TenDoi: 1 })
                            .exec();
                    }
                }
            }
        }

        res.render('doituyen', {
            title: 'Đội tuyển',
            doituyen: dt,
            canManage: canManage,
            isAdmin: isAdmin,
            currentPlayer: currentPlayer,
            pendingTeamId: pendingTeamId,
            session: req.session
        });
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});

router.get('/them', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    res.render('doituyen_them', { title: 'Thêm đội tuyển' });
});

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
            chiTiet: (doiTuyenMoi.TruongDoi || 'Đội mới') + ' đã được thêm.',
            mucDo: 'Thong tin'
        });
        req.session.success = 'Đã thêm đội tuyển thành công.';
        return res.redirect('/doituyen');
    } catch (err) {
        req.session.error = 'Không thể thêm đội tuyển.';
        return res.redirect('/doituyen/them');
    }
});

router.post('/xin-gia-nhap/:id', auth.yeuCauDangNhap, async function (req, res) {
    try {
        const teamId = req.params.id;
        const player = await NguoiChoi.findOne({ TaiKhoan: req.session.MaNguoiDung }).exec();

        if (!player) throw new Error('Không tìm thấy hồ sơ người chơi.');
        if (player.DoiTuyen) throw new Error('Bạn đã thuộc một đội khác, phải rời đội cũ trước!');

        const team = await DoiTuyen.findById(teamId).exec();
        if (!team) throw new Error('Không tìm thấy đội tuyển.');
        if (team.ThanhVien && team.ThanhVien.length >= 4) throw new Error('Đội này đã đủ 4 thành viên chính thức!');

        const playerId = player._id.toString();
        const daChoDoiNay = (team.ThanhVienChoDuyet || []).some(function (id) {
            return id.toString() === playerId;
        });
        if (daChoDoiNay) {
            throw new Error('Bạn đã gửi yêu cầu cho đội này rồi, đang chờ Admin duyệt!');
        }

        // Chỉ cho phép 1 yêu cầu chờ duyệt duy nhất trên toàn hệ thống.
        const dsDangCho = await DoiTuyen.find({ ThanhVienChoDuyet: player._id })
            .sort({ updatedAt: -1 })
            .select('_id TenDoi')
            .lean()
            .exec();

        if (dsDangCho.length > 0) {
            // Nếu đã chờ ở đội khác -> chặn.
            const teamDangCho = dsDangCho.find(function (x) { return x._id.toString() !== teamId.toString(); });
            if (teamDangCho) {
                throw new Error('Bạn đang chờ duyệt ở đội "' + teamDangCho.TenDoi + '". Không thể xin thêm đội khác.');
            }

            // Nếu dữ liệu cũ bị trùng nhiều đội thì dọn bớt, giữ đội mới nhất.
            if (dsDangCho.length > 1) {
                const keepId = dsDangCho[0]._id.toString();
                const removeIds = dsDangCho
                    .filter(function (x) { return x._id.toString() !== keepId; })
                    .map(function (x) { return x._id; });
                if (removeIds.length > 0) {
                    await DoiTuyen.updateMany({ _id: { $in: removeIds } }, { $pull: { ThanhVienChoDuyet: player._id } }).exec();
                }
            }
        }

        await DoiTuyen.findByIdAndUpdate(teamId, { $addToSet: { ThanhVienChoDuyet: player._id } }).exec();
        req.session.success = 'Đã gửi yêu cầu gia nhập! Chờ Admin duyệt nhé.';
        res.redirect('/doituyen');
    } catch (err) {
        req.session.error = err.message;
        res.redirect('/doituyen');
    }
});

router.post('/duyet-thanh-vien/:teamId/:userId', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    try {
        const { teamId, userId } = req.params;
        const team = await DoiTuyen.findById(teamId).exec();

        if (!team) throw new Error('Đội không tồn tại.');
        if (team.ThanhVien && team.ThanhVien.length >= 4) throw new Error('Đội đã đủ 4 người, không thể duyệt thêm!');

        await DoiTuyen.findByIdAndUpdate(teamId, {
            $pull: { ThanhVienChoDuyet: userId },
            $addToSet: { ThanhVien: userId }
        }).exec();

        await NguoiChoi.findByIdAndUpdate(userId, { DoiTuyen: teamId }).exec();

        // Xóa mọi yêu cầu chờ duyệt còn lại ở đội khác để đảm bảo 1 người chỉ thuộc 1 đội.
        await DoiTuyen.updateMany({ _id: { $ne: teamId } }, { $pull: { ThanhVienChoDuyet: userId } }).exec();

        req.session.success = 'Đã duyệt thành viên vào đội thành công!';
        res.redirect('/doituyen');
    } catch (err) {
        req.session.error = err.message;
        res.redirect('/doituyen');
    }
});

router.post('/tu-choi-thanh-vien/:teamId/:userId', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    try {
        await DoiTuyen.findByIdAndUpdate(req.params.teamId, {
            $pull: { ThanhVienChoDuyet: req.params.userId }
        }).exec();
        req.session.success = 'Đã từ chối yêu cầu gia nhập.';
        res.redirect('/doituyen');
    } catch (err) {
        res.redirect('/doituyen');
    }
});

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
