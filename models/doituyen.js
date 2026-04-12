const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DoiTuyenSchema = new Schema({
  TenDoi: { type: String, required: true },
  TruongDoi: { type: String },
  SoDienThoai: { type: String },
  Email: { type: String },
  GhiChu: { type: String },
  KichHoat: { type: Boolean, default: true },
  
  // Mảng chính thức: Chứa ID các người chơi đã được duyệt vào đội
  ThanhVien: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'NguoiChoi'
  }],
  
  // MẢNG MỚI: Phòng chờ - Chứa ID những người bấm "Gia nhập" nhưng chưa duyệt
  ThanhVienChoDuyet: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'NguoiChoi'
  }]
}, { timestamps: true, collection: 'doituyen' });

module.exports = mongoose.model('DoiTuyen', DoiTuyenSchema);