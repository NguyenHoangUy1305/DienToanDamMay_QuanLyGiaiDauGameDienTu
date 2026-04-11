var ThongBao = require('../models/thongbao');

async function taoThongBaoHeThong(options) {
    try {
        if (!options || !options.tieuDe || !options.noiDung) {
            return null;
        }

        var thongBao = await ThongBao.create({
            TieuDe: options.tieuDe,
            NoiDung: options.noiDung,
            LoaiThongBao: options.loaiThongBao || 'HeThong',
            MucDo: options.mucDo || 'Thong tin',
            NguoiGui: options.nguoiGui || null,
            NguoiNhan: options.nguoiNhan || [],
            DaDoc: options.daDoc || [],
            KichHoat: typeof options.kichHoat === 'boolean' ? options.kichHoat : true,
            NgayHetHan: options.ngayHetHan || null
        });

        return thongBao;
    }
    catch (err) {
        console.log('Khong the tao thong bao he thong:', err.message || err);
        return null;
    }
}

module.exports = {
    taoThongBaoHeThong: taoThongBaoHeThong
};
