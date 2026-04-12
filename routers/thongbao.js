var express = require('express');
var router = express.Router();
var ThongBao = require('../models/thongbao');
var auth = require('../middlewares/auth');

// Thong bao chi danh cho noi bo (Admin/Nhan vien)
router.get('/', auth.yeuCauStaffHoacAdmin, async (req, res) => {
    try {
        var userId = req.session && req.session.MaNguoiDung ? req.session.MaNguoiDung : null;

        var dsThongBao = await ThongBao.find({
            $or: [
                { NguoiNhan: { $exists: true, $size: 0 } },
                { NguoiNhan: userId }
            ],
            KichHoat: true
        })
        .populate('NguoiGui')
        .sort({ createdAt: -1 })
        .lean()
        .exec();

        res.render('thongbao', {
            title: 'Thông báo hệ thống',
            thongbao: dsThongBao,
            currentUserId: userId
        });
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});

router.post('/doc/:id', auth.yeuCauStaffHoacAdmin, async (req, res) => {
    await ThongBao.findByIdAndUpdate(req.params.id, {
        $addToSet: { DaDoc: req.session.MaNguoiDung }
    });
    res.json({ success: true });
});

module.exports = router;
