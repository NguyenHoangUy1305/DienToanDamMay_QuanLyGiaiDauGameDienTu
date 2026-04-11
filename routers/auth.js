var express = require('express');
var router = express.Router();
var bcrypt = require('bcryptjs');
var TaiKhoan = require('../models/taikhoan');
var nhatKyHeThong = require('../services/nhatkyhethong');
var thongBaoHeThong = require('../services/thongbao');

// GET: Đăng ký
router.get('/dangky', async (req, res) => {
    try {
        var message = '';
        if (req.session && req.session.error) {
            message = '<div class="alert alert-danger">' + req.session.error + '</div>';
            req.session.error = null;
        } else if (req.session && req.session.success) {
            message = '<div class="alert alert-success">' + req.session.success + '</div>';
            req.session.success = null;
        }
        res.render('dangky', {
            title: 'Đăng ký tài khoản',
            message: message
        });
    } catch (err) {
        console.error('Error rendering dangky:', err);
        res.status(500).send('Error: ' + err.message);
    }
});

// POST: Đăng ký
router.post('/dangky', async (req, res) => {
    try {
        var kiemTraTenDangNhap = await TaiKhoan.findOne({
            TenDangNhap: req.body.TenDangNhap
        }).exec();

        if (kiemTraTenDangNhap) {
            await nhatKyHeThong.ghiNhatKy(req, {
                hanhDong: 'Đăng ký tài khoản thất bại',
                doiTuong: req.body.TenDangNhap,
                chiTiet: 'Tên đăng nhập đã tồn tại.',
                mucDo: 'Canh bao'
            });

            req.session.error = 'Tên đăng nhập đã tồn tại.';
            return res.redirect('/dangky');
        }

        var salt = bcrypt.genSaltSync(10);
        var data = {
            HoVaTen: req.body.HoVaTen,
            Email: req.body.Email,
            TenDangNhap: req.body.TenDangNhap,
            MatKhau: bcrypt.hashSync(req.body.MatKhau, salt),
            QuyenHan: 'nhanvien',
            KichHoat: true
        };

        var taiKhoanMoi = await TaiKhoan.create(data);
        await nhatKyHeThong.ghiNhatKy(req, {
            hanhDong: 'Đăng ký tài khoản',
            doiTuong: taiKhoanMoi.TenDangNhap,
            chiTiet: taiKhoanMoi.HoVaTen + ' đã đăng ký tài khoản mới.',
            duLieuMoi: {
                _id: taiKhoanMoi._id,
                HoVaTen: taiKhoanMoi.HoVaTen,
                TenDangNhap: taiKhoanMoi.TenDangNhap,
                QuyenHan: taiKhoanMoi.QuyenHan
            },
            mucDo: 'Thong tin'
        });
        await thongBaoHeThong.taoThongBaoHeThong({
            tieuDe: 'Đăng ký tài khoản mới',
            noiDung: taiKhoanMoi.HoVaTen + ' đã đăng ký tài khoản thành viên mới.',
            loaiThongBao: 'HeThong',
            mucDo: 'Thong tin'
        });

        req.session.success = 'Đăng ký tài khoản thành công. Vui lòng đăng nhập.';
        res.redirect('/dangnhap');
    }
    catch (err) {
        console.log(err);
        req.session.error = 'Không thể đăng ký tài khoản.';
        res.redirect('/dangky');
    }
});

// GET: Đăng nhập
router.get('/dangnhap', async (req, res) => {
    try {
        var message = '';
        if (req.session && req.session.error) {
            message = '<div class="alert alert-danger">' + req.session.error + '</div>';
            req.session.error = null;
        } else if (req.session && req.session.success) {
            message = '<div class="alert alert-success">' + req.session.success + '</div>';
            req.session.success = null;
        }
        res.render('dangnhap', {
            title: 'Đăng nhập',
            message: message
        });
    } catch (err) {
        console.error('Error rendering dangnhap:', err);
        res.status(500).send('Error: ' + err.message);
    }
});

// POST: Đăng nhập
router.post('/dangnhap', async (req, res) => {
    if (req.session.MaNguoiDung) {
        req.session.error = 'Người dùng đã đăng nhập rồi.';
        return res.redirect('/error');
    }

    var taikhoan = await TaiKhoan.findOne({
        TenDangNhap: req.body.TenDangNhap
    }).exec();

    if (taikhoan) {
        if (bcrypt.compareSync(req.body.MatKhau, taikhoan.MatKhau)) {
            if (taikhoan.KichHoat == 0) {
                await nhatKyHeThong.ghiNhatKy(req, {
                    hanhDong: 'Đăng nhập thất bại',
                    doiTuong: taikhoan.TenDangNhap,
                    chiTiet: 'Tài khoản đã bị khóa.',
                    mucDo: 'Canh bao'
                });

                req.session.error = 'Người dùng đã bị khóa tài khoản.';
                return res.redirect('/error');
            }
            else {
                req.session.MaNguoiDung = taikhoan._id;
                req.session.HoVaTen = taikhoan.HoVaTen;
                req.session.VaiTro = taikhoan.QuyenHan;
                req.session.QuyenHan = taikhoan.QuyenHan;

                await nhatKyHeThong.ghiNhatKy(req, {
                    hanhDong: 'Đăng nhập',
                    doiTuong: taikhoan.TenDangNhap,
                    chiTiet: taikhoan.HoVaTen + ' đã đăng nhập vào hệ thống.',
                    duLieuMoi: {
                        _id: taikhoan._id,
                        HoVaTen: taikhoan.HoVaTen,
                        TenDangNhap: taikhoan.TenDangNhap,
                        QuyenHan: taikhoan.QuyenHan
                    },
                    mucDo: 'Thong tin'
                });
                await thongBaoHeThong.taoThongBaoHeThong({
                    tieuDe: 'Người dùng đăng nhập',
                    noiDung: taikhoan.HoVaTen + ' vừa đăng nhập vào hệ thống.',
                    loaiThongBao: 'HeThong',
                    mucDo: 'Thong tin'
                });

                req.session.success = 'Đăng nhập thành công.';
                return res.redirect('/');
            }
        }
        else {
            await nhatKyHeThong.ghiNhatKy(req, {
                hanhDong: 'Đăng nhập thất bại',
                doiTuong: req.body.TenDangNhap,
                chiTiet: 'Mật khẩu không đúng.',
                mucDo: 'Canh bao'
            });

            req.session.error = 'Mật khẩu không đúng.';
            return res.redirect('/error');
        }
    }
    else {
        await nhatKyHeThong.ghiNhatKy(req, {
            hanhDong: 'Đăng nhập thất bại',
            doiTuong: req.body.TenDangNhap,
            chiTiet: 'Tên đăng nhập không tồn tại.',
            mucDo: 'Canh bao'
        });

        req.session.error = 'Tên đăng nhập không tồn tại.';
        return res.redirect('/error');
    }
});

// GET: Đăng xuất
router.get('/dangxuat', async (req, res) => {
    await nhatKyHeThong.ghiNhatKy(req, {
        hanhDong: 'Đăng xuất',
        doiTuong: req.session.HoVaTen || req.session.TenDangNhap || 'Người dùng',
        chiTiet: 'Người dùng đã đăng xuất khỏi hệ thống.',
        mucDo: 'Thong tin'
    });
    await thongBaoHeThong.taoThongBaoHeThong({
        tieuDe: 'Người dùng đăng xuất',
        noiDung: (req.session.HoVaTen || req.session.TenDangNhap || 'Người dùng') + ' đã đăng xuất khỏi hệ thống.',
        loaiThongBao: 'HeThong',
        mucDo: 'Thong tin'
    });

    req.session.destroy(() => {
        res.redirect('/');
    });
});

// GET: Error
router.get('/error', async (req, res) => {
    var message = req.session && req.session.error ? req.session.error : 'Có lỗi xảy ra.';
    if (req.session && req.session.error) req.session.error = null;
    res.render('error', {
        title: 'Lỗi',
        message: message
    });
});

// GET: Success
router.get('/success', async (req, res) => {
    var message = req.session && req.session.success ? req.session.success : 'Thành công.';
    if (req.session && req.session.success) req.session.success = null;
    res.render('success', {
        title: 'Thành công',
        message: message
    });
});

module.exports = router;

// DEV helper: become admin for current session (only when DEV_BECOME_ADMIN=1)
router.get('/dev/become-admin', async (req, res) => {
    if (process.env.DEV_BECOME_ADMIN !== '1') {
        return res.status(404).send('Not found');
    }
    req.session.MaNguoiDung = 'dev-admin';
    req.session.HoVaTen = 'Dev Admin';
    req.session.VaiTro = 'admin';
    req.session.QuyenHan = 'admin';
    req.session.success = 'Bạn đã được cấp quyền admin cho phiên này (dev).';
    res.redirect('/');
});
