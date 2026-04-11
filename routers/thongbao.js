var express = require('express');
var router = express.Router();
var ThongBao = require('../models/thongbao');
var auth = require('../middlewares/auth');

router.get('/', auth.yeuCauDangNhap, async (req, res) => {
    var dsThongBao = await ThongBao.find()
        .populate('NguoiGui')
        .sort({ createdAt: -1 })
        .lean()
        .exec();

    res.render('thongbao', {
        title: 'Thông báo',
        thongbao: dsThongBao
    });
});

module.exports = router;