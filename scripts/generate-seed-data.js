const fs = require('fs');
const path = require('path');

const outDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function oid(n) {
  return { $oid: n.toString(16).padStart(24, '0') };
}
function oidFromHex(hex) {
  return { $oid: hex.toString().padStart(24, '0') };
}
function date(s) {
  return { $date: new Date(s).toISOString() };
}

const hash123456 = '$2b$10$gj64LyYLA9SFARQnQUBMReYgyVMmqIkUUQvTcTHbW/Usi2kgDT4Wq';

const accounts = [
  { id: 1, HoVaTen: 'Nguyen Hoang Uy', TenDangNhap: 'admin', Email: 'admin@fconline.vn', VaiTro: 'admin', QuyenHan: 'admin' },
  { id: 2, HoVaTen: 'Le Trung Thanh', TenDangNhap: 'nhanvien1', Email: 'staff1@fconline.vn', VaiTro: 'nhanvien', QuyenHan: 'nhanvien' },
  { id: 3, HoVaTen: 'Pham Quoc Bao', TenDangNhap: 'nhanvien2', Email: 'staff2@fconline.vn', VaiTro: 'nhanvien', QuyenHan: 'nhanvien' },
  { id: 4, HoVaTen: 'Tran Minh Khoa', TenDangNhap: 'modkhoa', Email: 'modkhoa@fconline.vn', VaiTro: 'nhanvien', QuyenHan: 'nhanvien' },
  { id: 5, HoVaTen: 'Doan Van An', TenDangNhap: 'viewer1', Email: 'viewer1@fconline.vn', VaiTro: 'khach', QuyenHan: 'khach' },
  { id: 6, HoVaTen: 'Nguyen Thi Lan', TenDangNhap: 'viewer2', Email: 'viewer2@fconline.vn', VaiTro: 'khach', QuyenHan: 'khach' }
].map(a => ({
  _id: oid(a.id),
  HoVaTen: a.HoVaTen,
  Email: a.Email,
  TenDangNhap: a.TenDangNhap,
  MatKhau: hash123456,
  VaiTro: a.VaiTro,
  QuyenHan: a.QuyenHan,
  KichHoat: true,
  createdAt: date('2026-01-01'),
  updatedAt: date('2026-01-01')
}));

const teamNames = [
  'Seven TV', 'NK FC Online', 'EFC Academy', 'SGLX Esports', 'FPT Play Club', 'Sai Gon Legends', 'Ha Noi Wolves',
  'Da Nang Phoenix', 'Can Tho Warriors', 'Hue Imperial', 'T1 Vietnam', 'ProG Arena', 'Storm FC', 'Blue Shark'
];

const teams = teamNames.map((name, i) => ({
  _id: oid(1001 + i),
  TenDoi: name,
  TruongDoi: ['Nguyen Hoang Hiep','Le Trung Thanh','Pham Quoc Bao','Tran Minh Khoa','Vo Thanh Dat','Bui Duy Khang','Nguyen Minh Huy','Phan Van Dat','Tran Duc Minh','Doan Quoc Viet','Le Anh Tuan','Nguyen Tien Dat','Pham Duc Long','Nguyen Gia Han'][i],
  SoDienThoai: '0909' + String(100000 + i),
  Email: `team${i+1}@fconline.vn`,
  GhiChu: 'Doi tuyen thi dau FC Online',
  KichHoat: true,
  createdAt: date('2026-01-01'),
  updatedAt: date('2026-01-01')
}));

const ranks = ['Tinh Anh','Chuyen Nghiep','Huyen Thoai','The Gioi','Sieu Sao'];
const players = [];
let playerId = 2001;
for (let t = 0; t < teams.length; t++) {
  for (let p = 1; p <= 3; p++) {
    players.push({
      _id: oid(playerId),
      HoVaTen: `Player ${t + 1}-${p}`,
      NickName: `Team${t+1}P${p}`,
      Email: `team${t+1}p${p}@gmail.com`,
      SoDienThoai: '0911' + String(200000 + playerId),
      Rank: ranks[(t + p) % ranks.length],
      HinhAnh: `team${t+1}_p${p}.jpg`,
      DoiTuyen: teams[t]._id,
      GhiChu: 'Thanh vien doi tuyen',
      KichHoat: true,
      createdAt: date('2026-01-01'),
      updatedAt: date('2026-01-01')
    });
    playerId++;
  }
}
for (let i = 1; i <= 8; i++) {
  players.push({
    _id: oid(playerId),
    HoVaTen: `Solo Player ${i}`,
    NickName: `Solo${i}`,
    Email: `solo${i}@gmail.com`,
    SoDienThoai: '0933' + String(300000 + i),
    Rank: ranks[i % ranks.length],
    HinhAnh: `solo_${i}.jpg`,
    DoiTuyen: null,
    GhiChu: 'Nguoi choi ca nhan',
    KichHoat: true,
    createdAt: date('2026-01-01'),
    updatedAt: date('2026-01-01')
  });
  playerId++;
}

const tournaments = [
  ['FC Online Spring Open 2023','1vs1','2023-03-01','2023-03-20','Da ket thuc'],
  ['FC Online Summer Open 2023','1vs1','2023-06-01','2023-06-25','Da ket thuc'],
  ['FC Online Autumn Open 2024','1vs1','2024-09-01','2024-09-25','Da ket thuc'],
  ['FC Online Winter Open 2024','1vs1','2024-12-05','2024-12-28','Da ket thuc'],
  ['FC Online Spring Open 2025','1vs1','2025-03-05','2025-03-30','Da ket thuc'],
  ['FC Online Summer Open 2026','1vs1','2026-06-01','2026-06-25','Sap dien ra'],
  ['FC Online Team League 2023','doi','2023-04-01','2023-04-30','Da ket thuc'],
  ['FC Online Team League 2024','doi','2024-04-01','2024-04-30','Da ket thuc'],
  ['FC Online Team League 2025','doi','2025-04-01','2025-04-30','Da ket thuc'],
  ['FC Online Team League 2026','doi','2026-04-20','2026-05-20','Dang dien ra'],
  ['FC Online Pro Masters 2026','doi','2026-05-15','2026-06-15','Sap dien ra'],
  ['FC Online Champions Cup 2026','1vs1','2026-08-01','2026-08-30','Sap dien ra']
].map((g, i) => ({
  _id: oid(3001 + i),
  TenGiaiDau: g[0],
  NgayBatDau: date(g[2]),
  NgayKetThuc: date(g[3]),
  TheThuc: g[1],
  SoLuongToiDa: g[1] === 'doi' ? 8 : 16,
  TrangThai: g[4],
  MoTa: 'Giai dau FC Online mua giai gan nhat',
  KichHoat: true,
  createdAt: date(g[2]),
  updatedAt: date(g[2])
}));

const regs = [];
let regId = 4001;
const soloPlayers = players.filter(p => p.DoiTuyen === null).concat(players.filter(p => p.DoiTuyen !== null).slice(0, 28));
const teamTournaments = tournaments.filter(t => t.TheThuc === 'doi');
const soloTournaments = tournaments.filter(t => t.TheThuc === '1vs1');

soloTournaments.forEach((g, gi) => {
  const start = (gi * 12) % soloPlayers.length;
  const picks = [];
  for (let i = 0; i < 16; i++) picks.push(soloPlayers[(start + i) % soloPlayers.length]);
  picks.forEach((p, idx) => {
    regs.push({
      _id: oid(regId++),
      GiaiDau: g._id,
      NguoiChoi: p._id,
      DoiTuyen: null,
      NgayDangKy: date(new Date(new Date(g.NgayBatDau.$date).getTime() - (20 - idx) * 86400000)),
      TrangThaiDuyet: idx < 14 ? 'Da duyet' : 'Cho duyet',
      createdAt: date('2026-01-01'),
      updatedAt: date('2026-01-01')
    });
  });
});

teamTournaments.forEach((g, gi) => {
  const start = (gi * 4) % teams.length;
  const picks = [];
  for (let i = 0; i < 8; i++) picks.push(teams[(start + i) % teams.length]);
  picks.forEach((t, idx) => {
    regs.push({
      _id: oid(regId++),
      GiaiDau: g._id,
      NguoiChoi: null,
      DoiTuyen: t._id,
      NgayDangKy: date(new Date(new Date(g.NgayBatDau.$date).getTime() - (18 - idx) * 86400000)),
      TrangThaiDuyet: idx < 7 ? 'Da duyet' : 'Cho duyet',
      createdAt: date('2026-01-01'),
      updatedAt: date('2026-01-01')
    });
  });
});

const matches = [];
let matchId = 5001;
function addMatch(g, a, b, when, scoreA, scoreB, done) {
  matches.push({
    _id: oid(matchId++),
    GiaiDau: g._id,
    LoaiTran: g.TheThuc === 'doi' ? 'doi' : '1vs1',
    LoaiDoiTuongThiDau: g.TheThuc === 'doi' ? 'DoiTuyen' : 'NguoiChoi',
    DoiThu1Id: a._id,
    DoiThu2Id: b._id,
    VongDau: 'Vong bang',
    DoiThu1: a.TenDoi || a.HoVaTen,
    DoiThu2: b.TenDoi || b.HoVaTen,
    ThoiGianThiDau: date(when),
    TySo1: scoreA,
    TySo2: scoreB,
    ChiTietTySo: [],
    NguoiThang: done ? (scoreA === scoreB ? 'Hoa' : (scoreA > scoreB ? (a.TenDoi || a.HoVaTen) : (b.TenDoi || b.HoVaTen))) : null,
    TrangThai: done ? 'Da thi dau' : 'Chua thi dau',
    NguoiTao: oid(1),
    NguoiCapNhat: oid(1),
    KetQuaXacNhan: done,
    createdAt: date('2026-01-01'),
    updatedAt: date('2026-01-01')
  });
}

soloTournaments.forEach((g, gi) => {
  const approved = regs.filter(r => r.GiaiDau.$oid === g._id.$oid && r.NguoiChoi && r.TrangThaiDuyet === 'Da duyet')
    .map(r => players.find(p => p._id.$oid === r.NguoiChoi.$oid));
  for (let i = 0; i < 6; i++) {
    const a = approved[(i * 2) % approved.length];
    const b = approved[(i * 2 + 1) % approved.length];
    addMatch(g, a, b, new Date(new Date(g.NgayBatDau.$date).getTime() + (i + 1) * 86400000).toISOString(), (i + gi) % 4, (i + 2) % 4, gi < 5);
  }
});

teamTournaments.forEach((g, gi) => {
  const approved = regs.filter(r => r.GiaiDau.$oid === g._id.$oid && r.DoiTuyen && r.TrangThaiDuyet === 'Da duyet')
    .map(r => teams.find(t => t._id.$oid === r.DoiTuyen.$oid));
  for (let i = 0; i < 4; i++) {
    const a = approved[(i * 2) % approved.length];
    const b = approved[(i * 2 + 1) % approved.length];
    addMatch(g, a, b, new Date(new Date(g.NgayBatDau.$date).getTime() + (i + 2) * 86400000).toISOString(), (i + gi + 1) % 3, (i + 1) % 3, gi < 3);
  }
});

const standings = [];
let sxhId = 6001;
for (const g of tournaments) {
  const doneMatches = matches.filter(m => m.GiaiDau.$oid === g._id.$oid && m.TrangThai === 'Da thi dau');
  const table = new Map();
  const getKey = (m, side) => side === 1 ? m.DoiThu1Id.$oid : m.DoiThu2Id.$oid;
  const getName = (m, side) => side === 1 ? m.DoiThu1 : m.DoiThu2;
  for (const m of doneMatches) {
    [1, 2].forEach(side => {
      const key = getKey(m, side);
      if (!table.has(key)) {
        table.set(key, { key, name: getName(m, side), SoTran: 0, Thang: 0, Hoa: 0, Thua: 0, BanThang: 0, BanThua: 0, HieuSo: 0, Diem: 0 });
      }
    });
    const a = table.get(m.DoiThu1Id.$oid);
    const b = table.get(m.DoiThu2Id.$oid);
    a.SoTran++; b.SoTran++;
    a.BanThang += m.TySo1; a.BanThua += m.TySo2;
    b.BanThang += m.TySo2; b.BanThua += m.TySo1;
    a.HieuSo = a.BanThang - a.BanThua;
    b.HieuSo = b.BanThang - b.BanThua;
    if (m.TySo1 > m.TySo2) { a.Thang++; a.Diem += 3; b.Thua++; }
    else if (m.TySo2 > m.TySo1) { b.Thang++; b.Diem += 3; a.Thua++; }
    else { a.Hoa++; b.Hoa++; a.Diem++; b.Diem++; }
  }
  const sorted = Array.from(table.values()).sort((x, y) => y.Diem - x.Diem || y.HieuSo - x.HieuSo || y.BanThang - x.BanThang);
  sorted.forEach((s, idx) => standings.push({
    _id: oid(sxhId++),
    GiaiDau: g._id,
    DoiTuongThiDau: oidFromHex(s.key),
    LoaiDoiTuong: g.TheThuc === 'doi' ? 'DoiTuyen' : 'NguoiChoi',
    SoTran: s.SoTran,
    Thang: s.Thang,
    Hoa: s.Hoa,
    Thua: s.Thua,
    BanThang: s.BanThang,
    BanThua: s.BanThua,
    HieuSo: s.HieuSo,
    Diem: s.Diem,
    XepHang: idx + 1,
    createdAt: date('2026-01-01'),
    updatedAt: date('2026-01-01')
  }));
}

const notifications = [];
for (let i = 0; i < 20; i++) {
  notifications.push({
    _id: oid(7001 + i),
    TieuDe: i % 2 === 0 ? 'Cap nhat lich thi dau' : 'Thong bao he thong',
    NoiDung: i % 2 === 0 ? `Tran dau moi vua duoc tao (#${i + 1}).` : `He thong da cap nhat du lieu dot ${i + 1}.`,
    LoaiThongBao: i % 2 === 0 ? 'TranDau' : 'HeThong',
    MucDo: i % 3 === 0 ? 'Canh bao' : 'Thong tin',
    NguoiGui: oid(1),
    NguoiNhan: [oid(1), oid(2), oid(3)],
    DaDoc: i % 2 === 0 ? [oid(1)] : [oid(1), oid(2)],
    KichHoat: true,
    NgayHetHan: date('2027-01-01'),
    createdAt: date(`2026-02-${String((i % 27) + 1).padStart(2, '0')}`),
    updatedAt: date(`2026-02-${String((i % 27) + 1).padStart(2, '0')}`)
  });
}

const logs = [];
for (let i = 0; i < 30; i++) {
  logs.push({
    _id: oid(8001 + i),
    TaiKhoan: oid((i % 3) + 1),
    HanhDong: ['Dang nhap','Them giai dau','Them tran dau','Cap nhat ket qua','Xoa doi tuyen'][i % 5],
    DoiTuong: ['TaiKhoan','GiaiDau','TranDau','BangXepHang','DoiTuyen'][i % 5],
    ChiTiet: `Nhat ky nghiep vu #${i + 1}`,
    DuLieuCu: null,
    DuLieuMoi: { index: i + 1 },
    Ip: '127.0.0.1',
    MucDo: i % 4 === 0 ? 'Canh bao' : 'Thong tin',
    createdAt: date(`2026-03-${String((i % 27) + 1).padStart(2, '0')}`),
    updatedAt: date(`2026-03-${String((i % 27) + 1).padStart(2, '0')}`)
  });
}

function write(name, data) {
  fs.writeFileSync(path.join(outDir, name), JSON.stringify(data, null, 2), 'utf8');
}

write('taikhoan.json', accounts);
write('doituyen.json', teams);
write('nguoichoi.json', players);
write('giaidau.json', tournaments);
write('dangkygiaidau.json', regs);
write('trandau.json', matches);
write('bangxephang.json', standings);
write('thongbao.json', notifications);
write('nhatkyhethong.json', logs);

console.log('Done');
console.log({
  taikhoan: accounts.length,
  doituyen: teams.length,
  nguoichoi: players.length,
  giaidau: tournaments.length,
  dangkygiaidau: regs.length,
  trandau: matches.length,
  bangxephang: standings.length,
  thongbao: notifications.length,
  nhatkyhethong: logs.length
});
