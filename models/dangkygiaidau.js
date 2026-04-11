const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DangKyGiaiDauSchema = new Schema({
  GiaiDau: { type: Schema.Types.ObjectId, ref: 'GiaiDau', required: true },
  NguoiChoi: { type: Schema.Types.ObjectId, ref: 'NguoiChoi', default: null },
  DoiTuyen: { type: Schema.Types.ObjectId, ref: 'DoiTuyen', default: null },
  NgayDangKy: { type: Date, default: Date.now },
  TrangThaiDuyet: { type: String, default: 'Cho duyet' }
}, { timestamps: true, collection: 'dangkygiaidau' });

module.exports = mongoose.model('DangKyGiaiDau', DangKyGiaiDauSchema);
