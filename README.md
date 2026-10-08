# 🏆 HỆ THỐNG QUẢN LÝ GIẢI ĐẤU ESPORTS FC ONLINE (CLOUD-NATIVE WEB PLATFORM)

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express.js-5.x-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js" />
  <img src="https://img.shields.io/badge/Cloud_Database-MongoDB_Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB Atlas" />
  <img src="https://img.shields.io/badge/Cloud_Hosting-Render-46E3B7?style=for-the-badge&logo=render&logoColor=black" alt="Render" />
  <img src="https://img.shields.io/badge/Integration-Google_Calendar_API-4285F4?style=for-the-badge&logo=googlecalendar&logoColor=white" alt="Google Calendar API" />
  <img src="https://img.shields.io/badge/Architecture-MVC_Pattern-blue?style=for-the-badge" alt="MVC Pattern" />
</p>

<p align="center">
  🌐 <b>Live Demo Trực Tuyến:</b> <a href="https://dientoandammay-quanlygiaidaugamedientu.onrender.com">https://dientoandammay-quanlygiaidaugamedientu.onrender.com</a><br>
  💻 <b>GitHub Repository:</b> <a href="https://github.com/NguyenHoangUy1305/DienToanDamMay_QuanLyGiaiDauGameDienTu">DienToanDamMay_QuanLyGiaiDauGameDienTu</a>
</p>

---

## 📌 1. TỔNG QUAN DỰ ÁN
* **Môn học:** Điện toán đám mây (Cloud Computing)
* **Đơn vị đào tạo:** Khoa Công nghệ Thông tin – Trường Đại học An Giang (ĐHQG TP.HCM)
* **Giảng viên hướng dẫn:** ThS. Nguyễn Hoàng Tùng
* **Sinh viên thực hiện:** **Nguyễn Hoàng Uy** (MSSV: `DTH235812`) – Lớp: DH24TH3

Hệ thống là một nền tảng **Web-based Cloud-Native** chuyên biệt hỗ trợ quản lý và tổ chức các giải đấu Thể thao Điện tử (E-sports), được tối ưu hóa cho tựa game bóng đá **FC Online**. 

Dự án số hóa và tự động hóa toàn diện các khâu tổ chức giải: từ đăng ký đội thi đấu, xét duyệt hồ sơ trực tuyến, bốc thăm chia cặp, tự động sinh lịch thi đấu đồng bộ lên **Google Calendar**, cho đến cập nhật tỷ số và tự động nhảy thứ hạng trên **Bảng xếp hạng thời gian thực (Real-time Standings)**.

---

## ☁️ 2. ĐẶC ĐIỂM NỔI BẬT (CLOUD-NATIVE & THIRD-PARTY INTEGRATION)

1. **Cloud Database (MongoDB Atlas):**
   - Lưu trữ toàn bộ dữ liệu trên cụm máy chủ đám mây MongoDB Atlas DBaaS, đảm bảo khả năng mở rộng linh hoạt (Scalability) và tính sẵn sàng cao (High Availability).
2. **Cloud Deployment (PaaS Render):**
   - Ứng dụng được container hóa và triển khai trực tuyến trên nền tảng đám mây **Render**, kết nối Continuous Deployment (CD).
3. **Google Calendar API Integration:**
   - Tích hợp dịch vụ đám mây của Google qua thư viện `googleapis` và `@google-cloud/local-auth`. Sau khi ban tổ chức duyệt danh sách thi đấu, hệ thống tự động xuất và đồng bộ lịch thi đấu của các cặp đấu sang Google Calendar.
4. **Bảo mật & Cổng Quản trị Viên Bí mật (Easter Egg Shortcut):**
   - Mã hóa mật khẩu người dùng và ban tổ chức bằng thuật toán băm một chiều an toàn **BCrypt** (`bcryptjs`).
   - Quản lý phiên đăng nhập an toàn bằng `express-session`.
   - Trang đăng nhập ban tổ chức được bảo vệ an toàn: Tại trang chủ người dùng, nhấn tổ hợp phím **`Ctrl + Shift + A`** để mở Modal đăng nhập Quản trị viên/Nhân viên.
5. **Nhật ký Kiểm toán Hệ thống (Audit Logging System):**
   - Collection `NhatKyHeThong` ghi nhận tự động toàn bộ thao tác Thêm, Sửa, Xóa của Ban tổ chức để phục vụ truy vết và đối soát dữ liệu.

---

## 🏗️ 3. CÔNG NGHỆ & THƯ VIỆN SỬ DỤNG

| Thành phần | Công nghệ / Thư viện | Vai trò |
| :--- | :--- | :--- |
| **Backend Framework** | Node.js, Express.js 5.x | Xây dựng RESTful Routing, Middleware kiểm soát quyền truy cập |
| **Database** | MongoDB Atlas (Cloud NoSQL) | Lưu trữ tài liệu JSON động, tính sẵn sàng cao |
| **ODM** | Mongoose 9.x | Định nghĩa Schemas, thiết lập Index, Middleware và quan hệ dữ liệu |
| **Frontend Template**| EJS (Embedded JavaScript) | Render giao diện người dùng phía máy chủ (Server-Side Rendering) |
| **Third-Party API** | Google Calendar API v3 | Đồng bộ hóa lịch trình thi đấu lên hệ sinh thái Google |
| **Security & Auth** | `bcryptjs`, `express-session` | Băm mật khẩu muối, quản lý Session Cookie an toàn |
| **Deployment** | Render Cloud Platform | Hosting Web Service production |

---

## 🗄️ 4. THIẾT KẾ DỮ LIỆU (MONGOOSE SCHEMAS)

Hệ thống được thiết kế theo kiến trúc NoSQL Document gồm **9 Collections chính**:

* **`TaiKhoan`**: Quản lý tài khoản, mật khẩu băm BCrypt, quyền hạn (`admin`, `nhanvien`, `nguoichoi`).
* **`NguoiChoi`**: Thông tin cá nhân, nick in-game (IGN), xếp hạng, thành tích.
* **`DoiTuyen`**: Hồ sơ đội tuyển, đội trưởng, danh sách thành viên thi đấu.
* **`GiaiDau`**: Thông tin giải đấu, thể thức (Đơn 1vs1 / Đấu đội), quy mô, giải thưởng, trạng thái (Mở đăng ký, Đang diễn ra, Đã kết thúc).
* **`DangKyGiaiDau`**: Đơn đăng ký tham gia, trạng thái xét duyệt (`ChoDuyet`, `DaDuyet`, `TuChoi`).
* **`TranDau`**: Lịch thi đấu từng cặp đấu, tỷ số bàn thắng/bàn thua, thời gian thi đấu, link Google Event.
* **`BangXepHang`**: Điểm số (Thắng=3, Hòa=1, Thua=0), số trận đã đá, hiệu số bàn thắng bại (+/-).
* **`ThongBao`**: Hệ thống gửi thông báo kết quả và lịch thi đấu cho người chơi.
* **`NhatKyHeThong`**: Audit log lưu trữ người thao tác, hành động, thời gian và dữ liệu thay đổi.

---

## 📂 5. CẤU TRÚC THƯ MỤC THEO MÔ HÌNH MVC

```text
DienToanDamMay_QuanLyGiaiDauGameDienTu/
├── index.js              # Điểm khởi chạy chính của ứng dụng Express Server
├── package.json          # Danh sách Dependencies và Scripts
├── nodemon.json          # Cấu hình phát triển tự động reload
├── .env                  # Biến môi trường (PORT, MONGODB_URI, SESSION_SECRET)
├── data/                 # Dữ liệu JSON mẫu phục vụ Seed Database ban đầu
├── models/               # Định nghĩa các Mongoose Schemas (Cấu trúc DB)
│   ├── taikhoan.js
│   ├── nguoichoi.js
│   ├── doituyen.js
│   ├── giaidau.js
│   ├── dangkygiaidau.js
│   ├── trandau.js
│   ├── bangxephang.js
│   ├── thongbao.js
│   └── nhatkyhethong.js
├── routers/              # Controller điều hướng các HTTP Requests
│   ├── auth.js
│   ├── admin.js
│   ├── giaidau.js
│   ├── dangkygiaidau.js
│   ├── doituyen.js
│   ├── trandau.js
│   ├── bangxephang.js
│   └── gcal.js
├── services/             # Business Logic độc lập (Google API, Sinh lịch, Log)
│   ├── googlecalendar.js
│   ├── nhatkyhethong.js
│   └── thongbao.js
├── middlewares/          # Middleware kiểm soát quyền truy cập (Auth, Role check)
├── utils/                # Các hàm tiện ích hỗ trợ định dạng ngày, xử lý lỗi
├── views/                # Giao diện người dùng Server-Side Rendering (EJS)
├── public/               # Tài nguyên tĩnh (CSS, JavaScript, Images)
└── README.md
```

---

## 🚀 6. HƯỚNG DẪN CÀI ĐẶT & CHẠY LOCAL

### Yêu cầu:
* Đã cài đặt **Node.js (v18+)** và **npm**.
* Tài khoản **MongoDB Atlas** (hoặc MongoDB Local).

### Các bước cài đặt:
1. **Clone repository:**
   ```bash
   git clone https://github.com/NguyenHoangUy1305/DienToanDamMay_QuanLyGiaiDauGameDienTu.git
   cd DienToanDamMay_QuanLyGiaiDauGameDienTu
   ```
2. **Cài đặt thư viện:**
   ```bash
   npm install
   ```
3. **Cấu hình file môi trường `.env`:**
   Tạo file `.env` ở thư mục gốc với nội dung:
   ```env
   PORT=3000
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/qlgiaigame?retryWrites=true&w=majority
   SESSION_SECRET=fc_online_esports_secret_key
   ```
4. **Khởi chạy ứng dụng:**
   ```bash
   npm start
   # hoặc chạy chế độ phát triển:
   npm run dev
   ```
   Truy cập ứng dụng tại: `http://localhost:3000`

---

## 🔑 7. THÔNG TIN ĐĂNG NHẬP MẶC ĐỊNH
* **Giao diện Client (Người chơi):** Trực tiếp đăng ký tài khoản tại trang chủ hoặc xem lịch/kết quả tự do.
* **Giao diện Ban tổ chức (Admin / Staff):**
  - Tại trang chủ, bấm tổ hợp phím: **`Ctrl + Shift + A`** để mở form đăng nhập ẩn.
  - **Tài khoản Admin:** `admin` / Mật khẩu: `123456`
  - **Tài khoản Nhân viên:** `nhanvien1` / Mật khẩu: `123456`

---

## 👨‍💻 8. TÁC GIẢ DỰ ÁN
* **Nguyễn Hoàng Uy** – *Full-stack Developer & Cloud Architect* – [`NguyenHoangUy1305`](https://github.com/NguyenHoangUy1305)

*Khoa Công nghệ Thông tin – Trường Đại học An Giang (ĐHQG TP.HCM)*
