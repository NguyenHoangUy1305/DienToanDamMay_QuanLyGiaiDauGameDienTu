const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BangXepHangSchema = new Schema({
    GiaiDau: { type: Schema.Types.ObjectId, ref: 'GiaiDau', required: true },
    DoiTuongThiDau: { type: String, required: true }, // Lưu tên Người chơi hoặc tên Đội
    LoaiDoiTuong: { type: String }, // 'NguoiChoi' hoặc 'DoiTuyen'
    SoTran: { type: Number, default: 0 },
    Thang: { type: Number, default: 0 },
    Hoa: { type: Number, default: 0 },
    Thua: { type: Number, default: 0 },
    BanThang: { type: Number, default: 0 },
    BanThua: { type: Number, default: 0 },
    HieuSo: { type: Number, default: 0 },
    Diem: { type: Number, default: 0 },
    XepHang: { type: Number, default: 0 }
}, { timestamps: true, collection: 'bangxephang' });

module.exports = mongoose.model('BangXepHang', BangXepHangSchema);