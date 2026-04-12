var express = require('express');
var router = express.Router();

var auth = require('../middlewares/auth');

// Admin/Staff dashboard
router.get('/', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    res.render('admin_dashboard', {
        title: 'Khu vực quản lý'
    });
});

module.exports = router;
