var express = require('express');
var router = express.Router();
var googleCalendar = require('../services/googlecalendar');
var TranDau = require('../models/trandau');
var auth = require('../middlewares/auth');

// Check OAuth status (admin/staff only)
router.get('/status', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    try {
        var result = await googleCalendar.verifyAuth();
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({ ok: false, error: err.message || String(err) });
    }
});

// Create a test event for a given tran dau id and return the event link
router.get('/create-test/:id', auth.yeuCauStaffHoacAdmin, async function (req, res) {
    try {
        var id = req.params.id;
        var td = await TranDau.findById(id).populate('GiaiDau').lean().exec();
        if (!td) return res.status(404).json({ ok: false, error: 'Not found' });

        var evt = await googleCalendar.taoSuKienTranDau(td, td.GiaiDau ? td.GiaiDau.TenGiaiDau : null);
        return res.json({ ok: true, link: evt && evt.htmlLink });
    }
    catch (err) {
        return res.status(500).json({ ok: false, error: err.message || String(err) });
    }
});

module.exports = router;
