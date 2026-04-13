var express = require('express');
var router = express.Router();
var BangXepHang = require('../models/bangxephang');
var GiaiDau = require('../models/giaidau');
var NguoiChoi = require('../models/nguoichoi');
var DoiTuyen = require('../models/doituyen');
var TranDau = require('../models/trandau');
var auth = require('../middlewares/auth');

function toIdString(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'object' && value._id) return String(value._id).trim();
    return String(value).trim();
}

function looksLikeObjectId(value) {
    var v = toIdString(value);
    return /^[a-fA-F0-9]{24}$/.test(v);
}


router.get('/', auth.yeuCauDangNhap, async function (req, res) {
    try {
        var giaidauList = await GiaiDau.find({ KichHoat: true }).sort({ createdAt: -1 }).lean().exec();

        var selectedGiaiDau = req.query.GiaiDau;
        if (!selectedGiaiDau && giaidauList.length > 0) {
            selectedGiaiDau = giaidauList[0]._id.toString();
        }

        var filter = {};
        if (selectedGiaiDau) filter.GiaiDau = selectedGiaiDau;

        var all = await BangXepHang.find(filter)
            .sort({ XepHang: 1, Diem: -1, HieuSo: -1 })
            .lean()
            .exec();

        var idCandidates = [];
        all.forEach(function (item) {
            var idText = toIdString(item.DoiTuongThiDau);
            if (looksLikeObjectId(idText)) idCandidates.push(idText);
        });

        var players = [];
        var teams = [];

        if (idCandidates.length > 0) {
            players = await NguoiChoi.find({ _id: { $in: idCandidates } })
                .select('_id HoVaTen NickName')
                .lean()
                .exec();

            teams = await DoiTuyen.find({ _id: { $in: idCandidates } })
                .select('_id TenDoi')
                .lean()
                .exec();
        }

        var playerMap = {};
        players.forEach(function (p) {
            playerMap[p._id.toString()] = p.HoVaTen || p.NickName || p._id.toString();
        });

        var teamMap = {};
        teams.forEach(function (t) {
            teamMap[t._id.toString()] = t.TenDoi || t._id.toString();
        });

        var tranDauMap = {};
        if (selectedGiaiDau) {
            var dsTran = await TranDau.find({ GiaiDau: selectedGiaiDau })
                .select('DoiThu1Id DoiThu2Id DoiThu1 DoiThu2')
                .lean()
                .exec();

            dsTran.forEach(function (td) {
                var id1 = toIdString(td.DoiThu1Id);
                var id2 = toIdString(td.DoiThu2Id);
                if (id1 && td.DoiThu1) tranDauMap[id1] = td.DoiThu1;
                if (id2 && td.DoiThu2) tranDauMap[id2] = td.DoiThu2;
            });
        }

        all = all.map(function (item) {
            var raw = toIdString(item.DoiTuongThiDau);
            var tenHienThi = raw;

            if (item.LoaiDoiTuong === 'NguoiChoi' && playerMap[raw]) {
                tenHienThi = playerMap[raw];
            } else if (item.LoaiDoiTuong === 'DoiTuyen' && teamMap[raw]) {
                tenHienThi = teamMap[raw];
            } else if (playerMap[raw]) {
                tenHienThi = playerMap[raw];
            } else if (teamMap[raw]) {
                tenHienThi = teamMap[raw];
            } else if (tranDauMap[raw]) {
                tenHienThi = tranDauMap[raw];
            }

            return Object.assign({}, item, { DoiTuongThiDau: raw, TenHienThi: tenHienThi });
        });

        var bangxephangCaNhan = all.filter(function (i) { return i.LoaiDoiTuong === 'NguoiChoi'; });
        var bangxephangDoi = all.filter(function (i) { return i.LoaiDoiTuong === 'DoiTuyen'; });

                res.render('bangxephang', {
            title: 'Bảng xếp hạng',
            bangxephangCaNhan: bangxephangCaNhan,
            bangxephangDoi: bangxephangDoi,
            giaidau: giaidauList,
            selectedGiaiDau: selectedGiaiDau
        });
    } catch (err) {
        console.error(err);
        res.redirect('/error');
    }
});

module.exports = router;

