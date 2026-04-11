require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');

const app = express();

const uri = process.env.MONGODB_URI || 'mongodb://13hoanguy_db_user:123@ac-63dmeyd-shard-00-00.b8ir9xx.mongodb.net:27017/qlgiaigame?ssl=true&authSource=admin';

mongoose.connect(uri)
    .then(() => console.log('Da ket noi MongoDB.'))
    .catch((err) => {
        console.error('Loi ket noi MongoDB:', err);
    });

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use((req, res, next) => {
    console.log(new Date().toISOString(), req.method, req.path);
    next();
});

app.use(session({
    secret: process.env.SESSION_SECRET || 'FCOnline-Secret-Key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}));

app.use((req, res, next) => {
    const role = req.session ? (req.session.VaiTro || req.session.QuyenHan || 'khach') : 'khach';

    res.locals.session = req.session;
    res.locals.isLoggedIn = !!(req.session && req.session.MaNguoiDung);
    res.locals.role = role;
    res.locals.vaiTro = role;
    res.locals.isAdmin = role === 'admin';
    res.locals.isStaff = role === 'nhanvien';
    res.locals.canManage = role === 'admin' || role === 'nhanvien';

    const err = req.session ? req.session.error : null;
    const success = req.session ? req.session.success : null;
    const googleCalendarLink = req.session ? req.session.googleCalendarLink : null;

    if (req.session) {
        delete req.session.error;
        delete req.session.success;
        delete req.session.googleCalendarLink;
    }

    if (err) {
        res.locals.message = '<div class="alert alert-danger">' + err + '</div>';
    } else if (success) {
        res.locals.message = '<div class="alert alert-success">' + success + '</div>';
    } else {
        res.locals.message = '';
    }

    res.locals.googleCalendarLink = googleCalendarLink || '';
    next();
});

app.use('/', require('./routers/auth'));
app.use('/', require('./routers/index'));
app.use('/giaidau', require('./routers/giaidau'));
app.use('/trandau', require('./routers/trandau'));
app.use('/nguoichoi', require('./routers/nguoichoi'));
app.use('/dangkygiaidau', require('./routers/dangkygiaidau'));
app.use('/bangxephang', require('./routers/bangxephang'));
app.use('/doituyen', require('./routers/doituyen'));
app.use('/nhatkyhethong', require('./routers/nhatkyhethong'));
app.use('/thongbao', require('./routers/thongbao'));

app.get('/health', (req, res) => res.send('OK'));

app.use((req, res) => {
    res.status(404).render('error', {
        title: 'Loi',
        message: 'Khong tim thay trang',
        error: {}
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log('Server chay tai http://127.0.0.1:' + port);
});

module.exports = app;
