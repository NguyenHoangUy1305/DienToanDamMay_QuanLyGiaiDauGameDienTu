var express = require('express');
var router = express.Router();
var NhatKyHeThong = require('../models/nhatkyhethong');
var auth = require('../middlewares/auth');

router.get('/', auth.yeuCauAdmin, async (req, res) => {
    var dsNhatKy = await NhatKyHeThong.find()
        .populate('TaiKhoan')
        .sort({ createdAt: -1 })
        .lean()
        .exec();

    res.render('nhatkyhethong', {
        title: 'Nhật ký hệ thống',
        nhatkyhethong: dsNhatKy
    });
});

module.exports = router;