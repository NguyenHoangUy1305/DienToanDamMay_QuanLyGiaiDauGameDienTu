var express = require('express');
var router = express.Router();
var NhatKyHeThong = require('../models/nhatkyhethong');
var auth = require('../middlewares/auth');

router.get('/', auth.yeuCauAdmin, async (req, res) => {
    try {
        var dsNhatKy = await NhatKyHeThong.find()
            .populate('TaiKhoan')
            .sort({ createdAt: -1 })
            .limit(200).lean().exec();

        res.render('nhatkyhethong', {
            title: 'Nhật ký hệ thống',
            nhatkyhethong: dsNhatKy || [],
            session: req.session, // Cần để Sidebar hiện tên người dùng
            isAdmin: true,
            canManage: true
        });
    } catch (err) {
        console.error("Lỗi tải nhật ký:", err);
        res.redirect('/');
    }
});

module.exports = router;