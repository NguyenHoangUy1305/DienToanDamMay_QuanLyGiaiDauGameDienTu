const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NguoiChoiSchema = new Schema({
  HoVaTen: { type: String, required: true },
  NickName: { type: String },
  Email: { type: String },
  SoDienThoai: { type: String },
  Rank: { type: String },
  HinhAnh: { type: String },
  DoiTuyen: { type: Schema.Types.ObjectId, ref: 'DoiTuyen', default: null },
  TaiKhoan: { type: Schema.Types.ObjectId, ref: 'TaiKhoan', default: null },
  GhiChu: { type: String },
  KichHoat: { type: Boolean, default: true }
}, { timestamps: true, collection: 'nguoichoi' });

module.exports = mongoose.model('NguoiChoi', NguoiChoiSchema);
