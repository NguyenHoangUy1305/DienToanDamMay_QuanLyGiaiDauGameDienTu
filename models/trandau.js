const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ChiTietTySoSchema = new Schema({
  NguoiChoi: { type: Schema.Types.ObjectId, ref: 'NguoiChoi' },
  TenNguoiChoi: { type: String },
  DoiThu: { type: String },
  BanThang: { type: Number, default: 0 }
}, { _id: false });

const TranDauSchema = new Schema({
  GiaiDau: { type: Schema.Types.ObjectId, ref: 'GiaiDau', required: true },
  LoaiTran: { type: String },
  LoaiDoiTuongThiDau: { type: String },
  DoiThu1Id: { type: Schema.Types.ObjectId },
  DoiThu2Id: { type: Schema.Types.ObjectId },
  VongDau: { type: String },
  DoiThu1: { type: String },
  DoiThu2: { type: String },
  ThoiGianThiDau: { type: Date },
  TySo1: { type: Number, default: 0 },
  TySo2: { type: Number, default: 0 },
  ChiTietTySo: { type: [ChiTietTySoSchema], default: [] },
  NguoiThang: { type: String },
  TrangThai: { type: String },
  NguoiTao: { type: Schema.Types.ObjectId, ref: 'TaiKhoan' },
  NguoiCapNhat: { type: Schema.Types.ObjectId, ref: 'TaiKhoan' },
  KetQuaXacNhan: { type: Boolean, default: false }
}, { timestamps: true, collection: 'trandau' });

module.exports = mongoose.model('TranDau', TranDauSchema);
