const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ThongBaoSchema = new Schema({
  TieuDe: { type: String, required: true },
  NoiDung: { type: String, required: true },
  LoaiThongBao: { type: String },
  MucDo: { type: String },
  NguoiGui: { type: Schema.Types.ObjectId, ref: 'TaiKhoan', default: null },
  NguoiNhan: [{ type: Schema.Types.ObjectId, ref: 'TaiKhoan' }],
  DaDoc: [{ type: Schema.Types.ObjectId, ref: 'TaiKhoan' }],
  KichHoat: { type: Boolean, default: true },
  NgayHetHan: { type: Date }
}, { timestamps: true, collection: 'thongbao' });

module.exports = mongoose.model('ThongBao', ThongBaoSchema);
