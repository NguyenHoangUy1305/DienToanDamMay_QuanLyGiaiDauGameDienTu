const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DoiTuyenSchema = new Schema({
  TenDoi: { type: String, required: true },
  TruongDoi: { type: String },
  SoDienThoai: { type: String },
  Email: { type: String },
  GhiChu: { type: String },
  KichHoat: { type: Boolean, default: true }
}, { timestamps: true, collection: 'doituyen' });

module.exports = mongoose.model('DoiTuyen', DoiTuyenSchema);
