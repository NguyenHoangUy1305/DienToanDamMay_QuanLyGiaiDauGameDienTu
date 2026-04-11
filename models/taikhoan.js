const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TaiKhoanSchema = new Schema({
  HoVaTen: { type: String, required: true },
  Email: { type: String },
  TenDangNhap: { type: String, required: true, unique: true, index: true },
  MatKhau: { type: String },
  VaiTro: { type: String },
  QuyenHan: { type: String },
  KichHoat: { type: Boolean, default: true }
}, { timestamps: true, collection: 'taikhoan' });

module.exports = mongoose.model('TaiKhoan', TaiKhoanSchema);
