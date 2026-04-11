var express = require('express');
var router = express.Router();

var BangXepHang = require('../models/bangxephang');
var GiaiDau = require('../models/giaidau');
var auth = require('../middlewares/auth');

router.get('/', auth.yeuCauDangNhap, async function (req, res) {
    // load available tournaments
    var giaidauList = await GiaiDau.find({ KichHoat: { $ne: false } }).sort({ TenGiaiDau: 1 }).lean().exec();

    // determine selected tournament (query param `GiaiDau`). If not provided, default to the latest updated one if available.
    var selectedGiaiDau = (req.query && req.query.GiaiDau) ? req.query.GiaiDau.toString() : '';
    if (!selectedGiaiDau && giaidauList && giaidauList.length > 0) {
        // prefer the most recently updated tournament
        var latest = await GiaiDau.findOne({ KichHoat: { $ne: false } }).sort({ updatedAt: -1 }).lean().exec();
        if (latest) selectedGiaiDau = latest._id.toString();
    }

    var filter = {};
    if (selectedGiaiDau) filter.GiaiDau = selectedGiaiDau;

    var all = await BangXepHang.find(filter)
        .populate('GiaiDau')
        .sort({ XepHang: 1, Diem: -1, HieuSo: -1 })
        .lean()
        .exec();

    var bxhCaNhan = all.filter(function (item) {
        return item.LoaiDoiTuong === 'NguoiChoi' || !item.LoaiDoiTuong;
    });

    var bxhDoi = all.filter(function (item) {
        return item.LoaiDoiTuong === 'DoiTuyen';
    });

    res.render('bangxephang', {
        title: 'Bảng xếp hạng',
        bangxephangCaNhan: bxhCaNhan,
        bangxephangDoi: bxhDoi,
        giaidau: giaidauList,
        selectedGiaiDau: selectedGiaiDau
    });
});

module.exports = router;
