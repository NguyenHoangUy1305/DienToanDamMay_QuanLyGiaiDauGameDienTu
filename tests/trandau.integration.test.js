const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

let mongod;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  process.env.TEST_BYPASS_AUTH = '1';

  // require app after setting env
  app = require('../index');
  // ensure connection
  await mongoose.connection.asPromise();
  // create a test account and expose its id for auth bypass
  const TaiKhoan = require('../models/taikhoan');
  const admin = await TaiKhoan.create({ HoVaTen: 'Test Admin', TenDangNhap: 'admin', MatKhau: 'password', VaiTro: 'admin' });
  process.env.TEST_USER_ID = admin._id.toString();
  process.env.TEST_USER_ROLE = 'admin';
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

beforeEach(async () => {
  // clean all collections
  const collections = Object.keys(mongoose.connection.collections);
  for (const name of collections) {
    await mongoose.connection.collections[name].deleteMany({});
  }
});

test('Add, edit and enter result for a 1vs1 match', async () => {
  const GiaiDau = require('../models/giaidau');
  const NguoiChoi = require('../models/nguoichoi');
  const DangKyGiaiDau = require('../models/dangkygiaidau');
  const TranDau = require('../models/trandau');

  // create tournament
  const gd = await GiaiDau.create({
    TenGiaiDau: 'Test Cup',
    NgayBatDau: new Date(),
    NgayKetThuc: new Date(Date.now() + 1000 * 60 * 60 * 24),
    TheThuc: '1vs1',
    KichHoat: true
  });

  // create two players
  const p1 = await NguoiChoi.create({ HoVaTen: 'Alice', NickName: 'alice' });
  const p2 = await NguoiChoi.create({ HoVaTen: 'Bob', NickName: 'bob' });

  // register both (approved)
  await DangKyGiaiDau.create({ GiaiDau: gd._id, NguoiChoi: p1._id, TrangThaiDuyet: 'Đã duyệt' });
  await DangKyGiaiDau.create({ GiaiDau: gd._id, NguoiChoi: p2._id, TrangThaiDuyet: 'Đã duyệt' });

  // create match via POST /trandau/them
  const resAdd = await request(app)
    .post('/trandau/them')
    .type('form')
    .send({
      GiaiDau: gd._id.toString(),
      DoiThu1Id: p1._id.toString(),
      DoiThu2Id: p2._id.toString(),
      VongDau: 'Vòng 1',
      ThoiGianThiDau: new Date().toISOString(),
      TySo1: '0',
      TySo2: '0',
      TrangThai: 'Chua thi dau'
    });

  expect(resAdd.status).toBe(302);
  expect(resAdd.headers.location).toMatch(/\/trandau/);

  const created = await TranDau.findOne({ GiaiDau: gd._id }).lean().exec();
  if (!created) {
    const all = await TranDau.find().lean().exec();
    console.log('TranDau docs after POST:', all);
  }
  expect(created).toBeTruthy();
  expect(created.DoiThu1).toBe('Alice');
  expect(created.DoiThu2).toBe('Bob');

  // edit match
  const resEdit = await request(app)
    .post('/trandau/sua/' + created._id)
    .type('form')
    .send({
      GiaiDau: gd._id.toString(),
      DoiThu1Id: p1._id.toString(),
      DoiThu2Id: p2._id.toString(),
      VongDau: 'Vòng chung kết',
      ThoiGianThiDau: new Date().toISOString(),
      TySo1: '1',
      TySo2: '0',
      TrangThai: 'Da thi dau'
    });

  expect(resEdit.status).toBe(302);

  const updated = await TranDau.findById(created._id).lean().exec();
  expect(updated.VongDau).toBe('Vòng chung kết');
  expect(updated.TySo1).toBe(1);
  expect(updated.TySo2).toBe(0);

  // enter result via nhap-ket-qua route
  const resResult = await request(app)
    .post('/trandau/nhap-ket-qua/' + created._id)
    .type('form')
    .send({ TySo1: '2', TySo2: '1' });

  expect(resResult.status).toBe(302);

  const afterResult = await TranDau.findById(created._id).lean().exec();
  expect(afterResult.TySo1).toBe(2);
  expect(afterResult.TySo2).toBe(1);
  expect(afterResult.TrangThai).toBeDefined();
});

test('Team registration flow: add team registration via POST /dangkygiaidau/them', async () => {
  const GiaiDau = require('../models/giaidau');
  const DoiTuyen = require('../models/doituyen');
  const DangKyGiaiDau = require('../models/dangkygiaidau');

  // create team tournament
  const gd = await GiaiDau.create({
    TenGiaiDau: 'Team Cup',
    NgayBatDau: new Date(),
    NgayKetThuc: new Date(Date.now() + 1000 * 60 * 60 * 24),
    TheThuc: 'doi',
    KichHoat: true
  });

  // create a team
  const team = await DoiTuyen.create({ TenDoi: 'Team A' });

  // submit registration via POST
  const res = await request(app)
    .post('/dangkygiaidau/them')
    .type('form')
    .send({
      GiaiDau: gd._id.toString(),
      DoiTuyen: team._id.toString(),
      NgayDangKy: new Date().toISOString(),
      TrangThaiDuyet: 'Da duyet'
    });

  expect(res.status).toBe(302);
  expect(res.headers.location).toMatch(/\/dangkygiaidau/);

  const dk = await DangKyGiaiDau.findOne({ GiaiDau: gd._id }).lean().exec();
  expect(dk).toBeTruthy();
  expect(String(dk.DoiTuyen)).toBe(String(team._id));
});
