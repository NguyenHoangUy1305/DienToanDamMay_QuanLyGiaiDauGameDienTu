const mongoose = require('mongoose');
const statusUtil = require('../utils/status');
const TranDau = require('../models/trandau');
const BangXepHang = require('../models/bangxephang');

// Copy DB URI from index.js
const uri = 'mongodb://13hoanguy_db_user:123@ac-63dmeyd-shard-00-00.b8ir9xx.mongodb.net:27017/qlgiaidaugame?ssl=true&authSource=admin';

async function rebuildStandingsForTournament(giaiDauId) {
    var doneValues = statusUtil.valuesFor(statusUtil.STATUS.DA_THI_DAU);
    var dsTranDau = await TranDau.find({ GiaiDau: giaiDauId, TrangThai: { $in: doneValues } }).lean().exec();

    var bangTam = {};
    dsTranDau.forEach(function (item) {
        var doi1 = item.DoiThu1;
        var doi2 = item.DoiThu2;
        var tyso1 = item.TySo1 || 0;
        var tyso2 = item.TySo2 || 0;
        var loai = item.LoaiDoiTuongThiDau || (item.LoaiTran === 'doi' ? 'DoiTuyen' : 'NguoiChoi');

        if (!bangTam[doi1]) {
            bangTam[doi1] = { GiaiDau: giaiDauId, DoiTuongThiDau: doi1, LoaiDoiTuong: loai, SoTran: 0, Thang: 0, Hoa: 0, Thua: 0, BanThang: 0, BanThua: 0, HieuSo: 0, Diem: 0, XepHang: 0 };
        }
        if (!bangTam[doi2]) {
            bangTam[doi2] = { GiaiDau: giaiDauId, DoiTuongThiDau: doi2, LoaiDoiTuong: loai, SoTran: 0, Thang: 0, Hoa: 0, Thua: 0, BanThang: 0, BanThua: 0, HieuSo: 0, Diem: 0, XepHang: 0 };
        }

        bangTam[doi1].SoTran += 1;
        bangTam[doi2].SoTran += 1;

        bangTam[doi1].BanThang += tyso1;
        bangTam[doi1].BanThua += tyso2;
        bangTam[doi2].BanThang += tyso2;
        bangTam[doi2].BanThua += tyso1;

        bangTam[doi1].HieuSo += (tyso1 - tyso2);
        bangTam[doi2].HieuSo += (tyso2 - tyso1);

        if (tyso1 > tyso2) {
            bangTam[doi1].Thang += 1;
            bangTam[doi1].Diem += 3;
            bangTam[doi2].Thua += 1;
        } else if (tyso2 > tyso1) {
            bangTam[doi2].Thang += 1;
            bangTam[doi2].Diem += 3;
            bangTam[doi1].Thua += 1;
        } else {
            bangTam[doi1].Hoa += 1;
            bangTam[doi2].Hoa += 1;
            bangTam[doi1].Diem += 1;
            bangTam[doi2].Diem += 1;
        }
    });

    var dsBangXepHang = Object.values(bangTam);
    dsBangXepHang.sort(function (a, b) {
        if (b.Diem !== a.Diem) return b.Diem - a.Diem;
        if (b.HieuSo !== a.HieuSo) return b.HieuSo - a.HieuSo;
        return a.DoiTuongThiDau.localeCompare(b.DoiTuongThiDau);
    });

    for (var i = 0; i < dsBangXepHang.length; i++) dsBangXepHang[i].XepHang = i + 1;

    var session = null;
    try {
        session = await mongoose.startSession();
        if (session && session.withTransaction) {
            await session.withTransaction(async () => {
                await BangXepHang.deleteMany({ GiaiDau: giaiDauId }).session(session).exec();
                if (dsBangXepHang.length > 0) await BangXepHang.insertMany(dsBangXepHang, { session: session });
            });
        } else {
            await BangXepHang.deleteMany({ GiaiDau: giaiDauId }).exec();
            if (dsBangXepHang.length > 0) await BangXepHang.insertMany(dsBangXepHang);
        }
    }
    catch (err) {
        console.error('Error rebuilding standings for', giaiDauId, err);
        await BangXepHang.deleteMany({ GiaiDau: giaiDauId }).exec();
        if (dsBangXepHang.length > 0) await BangXepHang.insertMany(dsBangXepHang);
    }
    finally {
        if (session) session.endSession();
    }
}

async function main() {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB for migration.');

    var total = 0;
    var updated = 0;

    var cursor = TranDau.find().cursor();
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
        total++;
        const canonical = statusUtil.normalizeStatus(doc.TrangThai);
        const loai = doc.LoaiDoiTuongThiDau || (doc.LoaiTran === 'doi' ? 'DoiTuyen' : 'NguoiChoi');

        var sets = {};
        if (doc.TrangThai !== canonical) sets.TrangThai = canonical;
        if (!doc.LoaiDoiTuongThiDau || doc.LoaiDoiTuongThiDau !== loai) sets.LoaiDoiTuongThiDau = loai;

        if (Object.keys(sets).length > 0) {
            await TranDau.updateOne({ _id: doc._id }, { $set: sets }).exec();
            updated++;
        }
    }

    console.log(`Updated ${updated}/${total} TranDau documents.`);

    // Rebuild standings for all tournaments
    var giaiIds = await TranDau.distinct('GiaiDau').exec();
    var countRebuilt = 0;
    for (let gid of giaiIds) {
        try {
            await rebuildStandingsForTournament(gid);
            countRebuilt++;
        } catch (err) {
            console.error('Failed to rebuild for', gid, err);
        }
    }

    console.log(`Rebuilt standings for ${countRebuilt} tournaments.`);
    await mongoose.disconnect();
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
