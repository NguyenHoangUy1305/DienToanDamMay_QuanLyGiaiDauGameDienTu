ĐỒ ÁN ĐIỆN TOÁN ĐÁM MÂY:  Ứng dụng MongoDB Atlas Xây dựng hệ thống quản lý giải đấu bóng đá điện tử FC Online (ESPORTS / THỂ THAO)
Môn học: Điện toán đám mây

Giảng viên hướng dẫn: [Nguyễn Hoàng Tùng]

[Nguyễn Hoàng Uy] - [DTH235812]


1. MÔ TẢ DỰ ÁN
Dự án là một ứng dụng Web giúp quản lý các giải đấu (thể thao, e-sports), hỗ trợ từ khâu người chơi đăng ký tham gia (cá nhân 1vs1 hoặc theo Đội tuyển), cho đến khâu duyệt đăng ký, bốc thăm xếp lịch thi đấu tự động và cập nhật bảng xếp hạng.

Đặc điểm nổi bật (Đáp ứng yêu cầu Đồ án):

Điện toán đám mây: Cơ sở dữ liệu được lưu trữ hoàn toàn trên nền tảng đám mây MongoDB Atlas (Tương đương đề tài gợi ý số 7). Source code được deploy lên dịch vụ Cloud (VD: Render, Vercel, Heroku,...).

Tự xây dựng: Hệ thống được phát triển từ đầu (from scratch) với Node.js, Express và MongoDB.

2. LIÊN KẾT TRUY CẬP (ĐÃ DEPLOY)
Link ứng dụng Web (Live): [https://dientoandammay-quanlygiaidaugamedientu.onrender.com]

Link Repository: [https://github.com/DTH235812-NHoangUy/DienToanDamMay_QuanLyGiaiDauGameDienTu]

3. CÔNG NGHỆ VÀ DỊCH VỤ ĐÁM MÂY SỬ DỤNG
Backend: Node.js, Express.js.

Database: MongoDB (Sử dụng dịch vụ đám mây MongoDB Atlas).

Frontend: [EJS]

Hosting/Deployment: [Render]

API:Xài API của google calendar để admin/nhân viên quản lý lịch dễ hơn

4. CẤU TRÚC THƯ MỤC NỔI BẬT
Hệ thống được tổ chức theo mô hình MVC kết hợp Services, phân tách rõ ràng nhiệm vụ:

📁 data/: Chứa các file .json dùng để import dữ liệu mẫu ban đầu vào database.

📁 models/: Định nghĩa các lược đồ Cơ sở dữ liệu (Mongoose Schemas).

📁 routers/: Bộ xử lý điều hướng (Routing), tiếp nhận các request từ client và điều hướng đến logic xử lý phù hợp.

📁 views/: Chứa các tệp giao diện (Thị giác người dùng) để render trang web trực quan.

📁 services/: Chứa các API và Business Logic phức tạp, đặc biệt là các thuật toán sinh lịch thi đấu, xuất lịch và bắt cặp trận đấu.

📁 middlewares/: Xử lý phân quyền, xác thực (Auth) cho Admin/Nhân viên/Người chơi.

📁 utils/ & 📁 scripts/: Chứa các hàm tiện ích dùng chung và script hỗ trợ tự động hóa.


5. MÔ TẢ CƠ SỞ DỮ LIỆU
Hệ thống sử dụng MongoDB với các Collections chính sau:

TaiKhoan: Quản lý thông tin đăng nhập, phân quyền (Admin, Nhân viên, Người chơi).

NguoiChoi: Lưu trữ hồ sơ chi tiết của người chơi (Tên, Rank, hình ảnh, liên kết với Đội tuyển).

DoiTuyen: Quản lý thông tin đội thi đấu, danh sách thành viên chính thức và thành viên chờ duyệt gia nhập.

GiaiDau: Thông tin giải đấu (Thời gian, thể thức, số lượng tối đa).

DangKyGiaiDau: Lưu trữ yêu cầu tham gia giải (Cá nhân hoặc Đội) cùng trạng thái chờ duyệt.

TranDau: Quản lý chi tiết từng trận (Kèo đấu, đối thủ, tỷ số, người thắng) cho từng vòng đấu.

BangXepHang: Thống kê điểm số, thắng/hòa/thua và xếp hạng tổng để hiển thị cho người xem.

ThongBao & NhatKyHeThong: Lưu trữ thông báo gửi đến người dùng và log thao tác của hệ thống.
6. HƯỚNG DẪN SỬ DỤNG
A. Dành cho Người chơi (Client)
Truy cập web: Vào đường link ứng dụng trang chủ.

Đăng nhập/Đăng ký: Tạo tài khoản và đăng nhập.

Đăng ký giải đấu: * Người chơi có thể chọn giải đấu đang mở.

Lựa chọn hình thức thi đấu: Cá nhân (1vs1) hoặc tham gia/đăng ký thi đấu theo Đội tuyển.

Bấm đăng ký và chờ Admin/Nhân viên duyệt.

Xem lịch thi đấu: Sau khi được duyệt và có lịch, người chơi đăng nhập vào hệ thống, vào mục Lịch thi đấu sẽ tự động thấy được lịch trình, đối thủ của cá nhân mình hoặc đội mình.

B. Dành cho Quản trị viên (Admin / Nhân viên)
Để bảo mật hệ thống, trang đăng nhập của Ban quản trị được ẩn đi.

Tại giao diện ngoài của web, nhấn tổ hợp phím Ctrl + Shift + A. Hệ thống sẽ hiển thị form/chuyển hướng đến trang đăng nhập dành riêng cho Admin/Nhân viên.

Nhập tài khoản cấp quyền Quản trị.

Duyệt đăng ký: Vào mục quản lý duyệt người chơi / đội tuyển tham gia giải.

Xếp lịch thi đấu: Kích hoạt chức năng (trong services) để tự động sắp xếp đối thủ, tạo lịch thi đấu cho vòng đấu.

Cập nhật kết quả: Nhập tỷ số trận đấu, hệ thống sẽ tự động tính toán lại và cập nhật BangXepHang.
7. HƯỚNG DẪN CÀI ĐẶT CỤC BỘ (DÀNH CHO CHẤM ĐIỂM)
Nếu Giảng viên muốn chạy source code trên máy cá nhân:

Giải nén source code.

Mở terminal tại thư mục gốc của dự án.

Chạy lệnh cài đặt thư viện:

Bash
npm install
Cấu hình file .env (Chuỗi kết nối MongoDB Atlas, Port,...):

Code snippet
PORT=3000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/<dbname>
Chạy lệnh để import dữ liệu từ thư mục data (Nếu đã thiết lập script):

Bash
npm run seed  # Hoặc chạy node data/import.js tùy bạn setup
Khởi động server:

Bash
npm start # hoặc npm run dev (nodemon)
Truy cập http://localhost:3000 để sử dụng ứng dụng.

Lời cuối cùng em cảm ơn thầy vs các bạn đã xem và góp ý đồ án của em ạ
Sinh viên thực hiện : Nguyễn Hoàng Uy_DTH235812
