function ensureTestUser(req) {
  if (!process.env.TEST_BYPASS_AUTH) return;
  if (!req.session) req.session = {};
  if (process.env.TEST_USER_ID) req.session.MaNguoiDung = process.env.TEST_USER_ID;
  if (process.env.TEST_USER_ROLE) {
    req.session.VaiTro = process.env.TEST_USER_ROLE;
    req.session.QuyenHan = process.env.TEST_USER_ROLE;
  }
}

function isJsonRequest(req) {
  return req.xhr || (req.headers && req.headers.accept && req.headers.accept.indexOf('json') !== -1);
}

module.exports = {
  yeuCauDangNhap: function (req, res, next) {
    ensureTestUser(req);
    if (req.session && req.session.MaNguoiDung) return next();
    if (isJsonRequest(req)) return res.status(401).json({ error: 'Unauthorized' });
    req.session = req.session || {};
    req.session.error = 'Vui lòng đăng nhập.';
    return res.redirect('/dangnhap');
  },

  yeuCauAdmin: function (req, res, next) {
    ensureTestUser(req);
    var role = req.session && (req.session.VaiTro || req.session.QuyenHan);
    if (role === 'admin') return next();
    if (isJsonRequest(req)) return res.status(403).json({ error: 'Forbidden' });
    req.session = req.session || {};
    req.session.error = 'Bạn không có quyền truy cập.';
    return res.redirect('/error');
  },

  yeuCauStaffHoacAdmin: function (req, res, next) {
    ensureTestUser(req);
    var role = req.session && (req.session.VaiTro || req.session.QuyenHan);
    if (role === 'admin' || role === 'nhanvien') return next();
    if (isJsonRequest(req)) return res.status(403).json({ error: 'Forbidden' });
    req.session = req.session || {};
    req.session.error = 'Bạn không có quyền truy cập.';
    return res.redirect('/error');
  }
};
