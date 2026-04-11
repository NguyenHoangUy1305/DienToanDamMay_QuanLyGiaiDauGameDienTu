var fs = require('fs').promises;
var path = require('path');
var statusUtil = require('../utils/status');

// Gọi thư viện Google
var google = null;
try {
    var _gp = require('googleapis');
    google = _gp.google;
} catch (e) {
    console.error("LỖI NẶNG: Chưa cài googleapis! Hãy chạy lệnh: npm install googleapis");
}

function pad2(n) {
    return String(n).padStart(2, '0');
}

function formatViewDate(date) {
    // FIX: Thêm số 0 vào trước ngày/tháng để Google Calendar mở chính xác 100%
    return date.getFullYear() + '/' + pad2(date.getMonth() + 1) + '/' + pad2(date.getDate());
}

function buildWeekViewUrl(dateValue) {
    var date = new Date(dateValue);
    return 'https://calendar.google.com/calendar/u/0/r/week/' + formatViewDate(date);
}

function buildDayViewUrl(dateValue) {
    var date = new Date(dateValue);
    return 'https://calendar.google.com/calendar/u/0/r/day/' + formatViewDate(date);
}

function formatUtcCompact(dateValue) {
    var d = new Date(dateValue);
    return d.getUTCFullYear() +
        pad2(d.getUTCMonth() + 1) +
        pad2(d.getUTCDate()) +
        'T' +
        pad2(d.getUTCHours()) +
        pad2(d.getUTCMinutes()) +
        pad2(d.getUTCSeconds()) +
        'Z';
}

function buildCreateEventUrl(tranDau, tenGiaiDau) {
    var batDau = new Date(tranDau.ThoiGianThiDau);
    var ketThuc = new Date(batDau.getTime() + 60 * 60 * 1000);
    var title = (tranDau.DoiThu1 || 'Doi 1') + ' vs ' + (tranDau.DoiThu2 || 'Doi 2');
    var details = [
        'Giải đấu: ' + (tenGiaiDau || 'FC Online'),
        'Vòng đấu: ' + (tranDau.VongDau || ''),
        'Trạng thái: ' + (statusUtil.toVietnameseStatus ? statusUtil.toVietnameseStatus(tranDau.TrangThai) : (tranDau.TrangThai || 'Chua thi dau'))
    ].join('\n');

    var params = new URLSearchParams({
        action: 'TEMPLATE',
        text: title,
        dates: formatUtcCompact(batDau) + '/' + formatUtcCompact(ketThuc),
        details: details,
        location: tranDau.SanThiDau || 'FC Online'
    });
    return 'https://calendar.google.com/calendar/render?' + params.toString();
}

function hasEnvOAuthConfig() {
    return !!(process.env.GCAL_CLIENT_ID && process.env.GCAL_CLIENT_SECRET && process.env.GCAL_REFRESH_TOKEN);
}

function shouldUseEnvOAuth() {
    return process.env.RENDER === 'true' || process.env.NODE_ENV === 'production' || process.env.GCAL_FORCE_ENV === 'true';
}

function buildEventPayload(tranDau, tenGiaiDau) {
    var batDau = new Date(tranDau.ThoiGianThiDau);
    var ketThuc = new Date(batDau.getTime() + 60 * 60 * 1000);
    return {
        summary: (tranDau.DoiThu1 || 'Doi 1') + ' vs ' + (tranDau.DoiThu2 || 'Doi 2'),
        location: tranDau.SanThiDau || 'FC Online',
        description: [
            'Giải đấu: ' + (tenGiaiDau || 'FC Online'),
            'Vòng đấu: ' + (tranDau.VongDau || ''),
            'Trạng thái: ' + (statusUtil.toVietnameseStatus ? statusUtil.toVietnameseStatus(tranDau.TrangThai) : (tranDau.TrangThai || 'Chua thi dau'))
        ].join('\n'),
        start: {
            dateTime: batDau.toISOString(),
            timeZone: 'Asia/Ho_Chi_Minh'
        },
        end: {
            dateTime: ketThuc.toISOString(),
            timeZone: 'Asia/Ho_Chi_Minh'
        }
    };
}

function createEnvOAuthClient() {
    // FIX: Bắt buộc phải có 'http://localhost' thì API nó mới chịu chạy
    var authClient = new google.auth.OAuth2(
        process.env.GCAL_CLIENT_ID,
        process.env.GCAL_CLIENT_SECRET,
        'http://localhost' 
    );
    authClient.setCredentials({
        refresh_token: process.env.GCAL_REFRESH_TOKEN
    });
    return authClient;
}

async function authorize() {
    if (!google) throw new Error("Thư viện googleapis chưa được cài đặt!");
    
    if (shouldUseEnvOAuth()) {
        if (!hasEnvOAuthConfig()) {
            throw new Error('Thiếu thông số GCAL trong file .env');
        }
        return createEnvOAuthClient();
    }
    throw new Error('Hãy thêm GCAL_FORCE_ENV=true vào file .env của bạn!');
}

    // Verify auth helper for diagnostics
    async function verifyAuth() {
        try {
            await authorize(false);
            return { ok: true };
        }
        catch (err) {
            return { ok: false, error: err.code || err.message || String(err) };
        }
    }

async function taoSuKienTranDau(tranDau, tenGiaiDau) {
    var auth = await authorize();
    var calendar = google.calendar({ version: 'v3', auth: auth });
    var event = buildEventPayload(tranDau, tenGiaiDau);

        var calendarId = process.env.GCAL_CALENDAR_ID || 'primary';
        var result = await calendar.events.insert({
            calendarId: calendarId,
            requestBody: event
        });

    return result.data;
}

module.exports = {
    taoSuKienTranDau: taoSuKienTranDau,
    buildWeekViewUrl: buildWeekViewUrl,
    buildDayViewUrl: buildDayViewUrl,
    buildCreateEventUrl: buildCreateEventUrl,
    hasEnvOAuthConfig: hasEnvOAuthConfig,
    shouldUseEnvOAuth: shouldUseEnvOAuth
        ,verifyAuth: verifyAuth
};