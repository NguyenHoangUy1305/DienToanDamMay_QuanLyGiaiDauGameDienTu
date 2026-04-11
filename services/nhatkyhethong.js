var NhatKyHeThong = require('../models/nhatkyhethong');

function layIp(req) {
    if (!req) {
        return null;
    }

    return req.headers['x-forwarded-for'] ||
        req.ip ||
        (req.connection && req.connection.remoteAddress) ||
        null;
}

async function ghiNhatKy(req, options) {
    try {
        if (!options || !options.hanhDong) {
            return;
        }

        await NhatKyHeThong.create({
            TaiKhoan: req && req.session && req.session.MaNguoiDung ? req.session.MaNguoiDung : null,
            HanhDong: options.hanhDong,
            DoiTuong: options.doiTuong || null,
            ChiTiet: options.chiTiet || null,
            DuLieuCu: options.duLieuCu || null,
            DuLieuMoi: options.duLieuMoi || null,
            Ip: options.ip || layIp(req),
            MucDo: options.mucDo || 'Thong tin'
        });
    }
    catch (err) {
        console.log('Khong the ghi nhat ky he thong:', err.message || err);
    }
}

module.exports = {
    ghiNhatKy: ghiNhatKy
};
