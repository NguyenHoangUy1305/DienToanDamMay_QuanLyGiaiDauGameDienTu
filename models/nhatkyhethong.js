const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NhatKySchema = new Schema({
  TaiKhoan: { type: Schema.Types.ObjectId, ref: 'TaiKhoan', default: null },
  HanhDong: { type: String, required: true },
  DoiTuong: { type: String },
  ChiTiet: { type: String },
  DuLieuCu: { type: Schema.Types.Mixed },
  DuLieuMoi: { type: Schema.Types.Mixed },
  Ip: { type: String },
  MucDo: { type: String, default: 'Thong tin' }
}, { timestamps: true, collection: 'nhatkyhethong' });

module.exports = mongoose.model('NhatKyHeThong', NhatKySchema);
