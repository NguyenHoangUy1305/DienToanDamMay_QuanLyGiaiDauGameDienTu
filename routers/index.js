const express = require('express');
const router = express.Router();
const GiaiDau = require('../models/giaidau');
const TranDau = require('../models/trandau');
const DangKyGiaiDau = require('../models/dangkygiaidau');
const NguoiChoi = require('../models/nguoichoi');
const BangXepHang = require('../models/bangxephang');

router.get('/', async (req, res) => {
    try {
        // 1. Đếm tất cả thông số thống kê (Dùng Promise.all để chạy nhanh nhất)
        const [
            tongGiaiDau, tongTranDau, tongDangKy, tongNguoiChoi, tongBangXepHang,
            tongDaDuyet, tongChoDuyet, tongTranDaThiDau, tongTranSapDienRa
        ] = await Promise.all([
            GiaiDau.countDocuments(),
            TranDau.countDocuments(),
            DangKyGiaiDau.countDocuments(),
            NguoiChoi.countDocuments(),
            BangXepHang.countDocuments(),
            DangKyGiaiDau.countDocuments({ TrangThaiDuyet: 'Da duyet' }),
            DangKyGiaiDau.countDocuments({ TrangThaiDuyet: 'Cho duyet' }),
            TranDau.countDocuments({ TrangThai: 'Da thi dau' }),
            TranDau.countDocuments({ TrangThai: 'Chua thi dau' })
        ]);

        // 2. Lấy danh sách hiển thị
        const giaiDauSapDienRa = await GiaiDau.find({ 
            TrangThai: { $in: ['Sap dien ra', 'Sắp diễn ra'] } 
        }).sort({ NgayBatDau: 1 }).limit(5).lean();

        const tranDauSapToi = await TranDau.find({ 
            TrangThai: 'Chua thi dau' 
        }).sort({ ThoiGianThiDau: 1 }).limit(5).lean();

        // 3. Render với đầy đủ các biến mà index.ejs yêu cầu
        res.render('index', {
            title: 'Hệ thống Quản lý FC Online',
            tongGiaiDau, tongTranDau, tongDangKy, tongNguoiChoi, tongBangXepHang,
            tongDaDuyet, tongChoDuyet, tongTranDaThiDau, tongTranSapDienRa,
            giaiDauSapDienRa, tranDauSapToi,
            role: req.session.VaiTro || 'khách',
            session: req.session
        });

    } catch (err) {
        console.error("Lỗi trang chủ:", err);
        res.status(500).send("Lỗi server khi tải trang chủ.");
    }
});

module.exports = router;