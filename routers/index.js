var express = require('express');
var router = express.Router();
var GiaiDau = require('../models/giaidau');
var TranDau = require('../models/trandau');
var DangKyGiaiDau = require('../models/dangkygiaidau');
var BangXepHang = require('../models/bangxephang');
var NguoiChoi = require('../models/nguoichoi');
var statusUtil = require('../utils/status');

router.get('/', async (req, res) => {
    var TRANG_THAI_GIAI_DAU_SAP_DIEN_RA = ['Sắp diễn ra', 'Sap dien ra'];
    var TRANG_THAI_DANG_KY_DA_DUYET = ['Đã duyệt', 'Da duyet'];
    var TRANG_THAI_DANG_KY_CHO_DUYET = ['Chờ duyệt', 'Cho duyet'];
    var TRANG_THAI_TRAN_DA_THI_DAU = statusUtil.valuesFor(statusUtil.STATUS.DA_THI_DAU);
    var TRANG_THAI_TRAN_SAP_DIEN_RA = statusUtil.valuesFor(statusUtil.STATUS.CHUA_THI_DAU).concat(statusUtil.valuesFor(statusUtil.STATUS.DANG_THI_DAU));

    var giaiDauMoiNhat = await GiaiDau.find().sort({ updatedAt: -1 }).limit(4).lean().exec();
    var tranDauMoiNhat = await TranDau.find().sort({ ThoiGianThiDau: -1 }).limit(4).lean().exec();

    var tongGiaiDau = await GiaiDau.countDocuments().exec();
    var tongTranDau = await TranDau.countDocuments().exec();
    var tongDangKy = await DangKyGiaiDau.countDocuments().exec();
    var tongBangXepHang = await BangXepHang.countDocuments().exec();
    var tongNguoiChoi = await NguoiChoi.countDocuments({ KichHoat: true }).exec();
    var tongDaDuyet = await DangKyGiaiDau.countDocuments({ TrangThaiDuyet: { $in: TRANG_THAI_DANG_KY_DA_DUYET } }).exec();
    var tongChoDuyet = await DangKyGiaiDau.countDocuments({ TrangThaiDuyet: { $in: TRANG_THAI_DANG_KY_CHO_DUYET } }).exec();
    var tongTranDaThiDau = await TranDau.countDocuments({ TrangThai: { $in: TRANG_THAI_TRAN_DA_THI_DAU } }).exec();
    var tongTranSapDienRa = await TranDau.countDocuments({ TrangThai: { $in: statusUtil.valuesFor(statusUtil.STATUS.CHUA_THI_DAU) } }).exec();

    var giaiDauSapDienRa = await GiaiDau.find({
        TrangThai: { $in: TRANG_THAI_GIAI_DAU_SAP_DIEN_RA },
        KichHoat: { $ne: false }
    })
        .sort({ NgayBatDau: 1 })
        .limit(3)
        .lean()
        .exec();

    var tranDauSapToi = await TranDau.find({ TrangThai: { $in: TRANG_THAI_TRAN_SAP_DIEN_RA } })
        .sort({ ThoiGianThiDau: 1 })
        .limit(3)
        .lean()
        .exec();

    var vaiTro = req.session ? (req.session.VaiTro || req.session.QuyenHan || 'khách') : 'khách';

    res.render('index', {
        title: 'Trang chủ',
        giaidau: giaiDauMoiNhat,
        trandau: tranDauMoiNhat,
        giaiDauSapDienRa: giaiDauSapDienRa,
        tranDauSapToi: tranDauSapToi,
        tongGiaiDau: tongGiaiDau,
        tongTranDau: tongTranDau,
        tongDangKy: tongDangKy,
        tongBangXepHang: tongBangXepHang,
        tongNguoiChoi: tongNguoiChoi,
        tongDaDuyet: tongDaDuyet,
        tongChoDuyet: tongChoDuyet,
        tongTranDaThiDau: tongTranDaThiDau,
        tongTranSapDienRa: tongTranSapDienRa,
        vaiTro: vaiTro
    });
});

module.exports = router;
