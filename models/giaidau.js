const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GiaiDauSchema = new Schema({
  TenGiaiDau: { type: String, required: true },
  NgayBatDau: { type: Date },
  NgayKetThuc: { type: Date },
  TheThuc: { type: String },
  SoLuongToiDa: { type: Number },
  TrangThai: { type: String },
  MoTa: { type: String },
  KichHoat: { type: Boolean, default: true }
}, { timestamps: true, collection: 'giaidau' });

module.exports = mongoose.model('GiaiDau', GiaiDauSchema);
