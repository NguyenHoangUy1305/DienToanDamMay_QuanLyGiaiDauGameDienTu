🏆 HỆ THỐNG QUẢN LÝ GIẢI ĐẤU ESPORTS FC ONLINE
Môn học: Điện toán đám mây

Giảng viên hướng dẫn: Thầy Nguyễn Hoàng Tùng

Sinh viên thực hiện: Nguyễn Hoàng Uy

Mã số sinh viên: DTH235812

1. TỔNG QUAN DỰ ÁN
Dự án là một nền tảng Web-based hỗ trợ quản lý toàn diện các giải đấu thể thao điện tử (E-sports), đặc biệt tối ưu cho tựa game FC Online. Hệ thống tự động hóa các quy trình từ đăng ký, xét duyệt đến bốc thăm chia bảng và cập nhật kết quả thời gian thực.

✨ Đặc điểm nổi bật (Cloud Native)
Cloud Database: Sử dụng MongoDB Atlas để lưu trữ dữ liệu, đảm bảo tính sẵn sàng cao và khả năng mở rộng.

Cloud Deployment: Toàn bộ mã nguồn được triển khai trên nền tảng Render.

Full-stack Development: Xây dựng từ con số 0 (from scratch) bằng hệ sinh thái Node.js.

Google Calendar Integration: Tích hợp API lịch của Google để đồng bộ hóa lịch thi đấu cho Ban tổ chức.



🔗 2. LIÊN KẾT TRUY CẬP
🌐 Live Demo: https://dientoandammay-quanlygiaidaugamedientu.onrender.com

💻 GitHub Repository: DTH235812-NHoangUy/DienToanDamMay_QuanLyGiaiDauGameDienTu




🛠 3. CÔNG NGHỆ SỬ DỤNG
Thành phần,Công nghệ
Backend,"Node.js, Express.js"
Database,MongoDB Atlas (Cloud)
Frontend,EJS (Embedded JavaScript templates)
Deployment,Render
Third-party API,Google Calendar API (Xuất và quản lý lịch thi đấu)





📂 4. CẤU TRÚC THƯ MỤC (MVC PATTERN)



├── data/        # File .json mẫu để import dữ liệu ban đầu
├── models/      # Định nghĩa Mongoose Schemas (Cấu trúc DB)
├── routers/     # Xử lý điều hướng các Request
├── views/       # Giao diện người dùng (EJS)
├── services/    # Business Logic (Thuật toán sinh lịch, API Google)
├── middlewares/ # Kiểm soát quyền truy cập (Auth, Admin/User)
├── utils/       # Các hàm tiện ích bổ trợ
└── public/      # Tài nguyên tĩnh (CSS, JS, Images)


🗄 5. KIẾN TRÚC DỮ LIỆU


Hệ thống được thiết kế với các Collections quan trọng sau:

TaiKhoan: Phân quyền quản trị và người dùng.

NguoiChoi / DoiTuyen: Thông tin hồ sơ cá nhân và đội nhóm.

GiaiDau: Lưu trữ thông tin thể thức, thời gian thi đấu.

DangKyGiaiDau: Trạng thái đăng ký (Chờ duyệt/Đã duyệt).

TranDau: Chi tiết cặp đấu, kết quả, tỷ số.

BangXepHang: Tự động tính điểm và xếp hạng dựa trên kết quả trận đấu.

ThongBao: Hệ thống tương tác với người dùng.

NhatKyHeThong: cập nhật tình hình nếu thêm xóa sửa của admin

🎮 6. HƯỚNG DẪN SỬ DỤNG




A. Đối với Người chơi (Client)

Đăng ký/Đăng nhập: Tạo tài khoản cá nhân.

Đăng ký thi đấu: Chọn giải đấu đang mở -> Chọn hình thức (1vs1 hoặc Đội) -> Gửi yêu cầu.

Theo dõi lịch: Xem lịch thi đấu cá nhân hóa ngay tại Dashboard sau khi Admin phê duyệt.

B. Đối với Quản trị viên (Admin)
Truy cập ẩn: Tại trang chủ, nhấn tổ hợp phím Ctrl + Shift + A để mở form đăng nhập Admin.

Duyệt hồ sơ: Quản lý danh sách đơn đăng ký tham gia.

Tự động hóa: Kích hoạt chức năng xếp lịch tự động và xuất lịch sang Google Calendar.

Quản lý kết quả: Cập nhật tỷ số, hệ thống sẽ tự động nhảy số liệu trên Bảng xếp hạng.

⚙️ 7. CÀI ĐẶT CỤC BỘ (LOCAL SETUP)
Dành cho việc kiểm tra và chấm điểm:

Clone dự án:
git clone https://github.com/DTH235812-NHoangUy/DienToanDamMay_QuanLyGiaiDauGameDienTu.git
cd DienToanDamMay_QuanLyGiaiDauGameDienTu
Cài đặt thư viện:
npm install
Cấu hình môi trường (.env): Tạo file .env với các nội dung:
PORT=3000
MONGODB_URI=your_mongodb_atlas_connection_string
GOOGLE_API_KEY=your_google_api_key

Khởi tạo dữ liệu (Seeding):
npm run seed


Chạy ứng dụng:
npm start



💖 LỜI CẢM ƠN
Em xin chân thành cảm ơn thầy Nguyễn Hoàng Tùng đã tận tình hướng dẫn và các bạn đã đóng góp ý kiến để em hoàn thành đồ án này một cách tốt nhất.

Người thực hiện: Nguyễn Hoàng Uy (DTH235812)

Mọi người trên git ai có ý tưởng mới thì liên hệ qua 
SĐT:0949353863
Email:13hoanguy@gmail.com and uy_dth235812@student.agu.edu.vn
