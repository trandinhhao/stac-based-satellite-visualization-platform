# system-requirements.md

# Đặc tả yêu cầu hệ thống

## 1. Giới thiệu

### 1.1 Mục đích

Tài liệu này mô tả các yêu cầu chức năng và phi chức năng của hệ thống:

> Nền tảng xử lý và trực quan hóa ảnh vệ tinh hiệu năng cao dựa trên chuẩn STAC

Tài liệu là cơ sở cho:

- Thiết kế hệ thống
- Phát triển phần mềm
- Kiểm thử
- Đánh giá kết quả dự án

---

## 2. Phạm vi hệ thống

Hệ thống cung cấp nền tảng WebGIS cho phép:

- Hiển thị ảnh vệ tinh
- Tìm kiếm dữ liệu theo không gian và thời gian
- Quản lý AOI (Area Of Interest)
- So sánh ảnh theo thời gian
- Thực hiện các phép đo GIS
- Theo dõi tiến trình xử lý dữ liệu
- Tích hợp AI Detection

---

# 3. Đối tượng sử dụng

## 3.1 Người dùng phổ thông

Có thể:

- Xem bản đồ
- Tìm kiếm vị trí
- Xem ảnh vệ tinh

---

## 3.2 Nhà nghiên cứu

Có thể:

- Phân tích dữ liệu ảnh
- So sánh dữ liệu theo thời gian
- Xuất dữ liệu AOI

---

## 3.3 Quản trị viên

Có thể:

- Quản lý người dùng
- Quản lý dữ liệu
- Giám sát hệ thống

---

# 4. Yêu cầu chức năng

---

# FR-01 Hiển thị bản đồ

## Mô tả

Hệ thống phải hiển thị bản đồ nền.

## Đầu vào

Không có.

## Đầu ra

Bản đồ hiển thị trên giao diện.

## Độ ưu tiên

Cao

---

# FR-02 Chuyển đổi lớp bản đồ

## Mô tả

Người dùng có thể chuyển đổi giữa các lớp:

- OpenStreetMap
- OpenFreeMap
- Sentinel-2

## Độ ưu tiên

Cao

---

# FR-03 Điều hướng bản đồ

## Mô tả

Hệ thống hỗ trợ:

- Zoom In
- Zoom Out
- Pan
- Reset View

## Độ ưu tiên

Cao

---

# FR-04 Tìm kiếm vị trí

## Mô tả

Người dùng tìm kiếm:

- Tên địa điểm
- Địa chỉ
- Tọa độ

## Kết quả

Bản đồ di chuyển tới vị trí tương ứng.

---

# FR-05 Hiển thị dữ liệu STAC

## Mô tả

Người dùng có thể:

- Xem Collections
- Xem Items
- Xem Assets

## Độ ưu tiên

Cao

---

# FR-06 Tìm kiếm ảnh theo thời gian

## Mô tả

Người dùng nhập:

- Ngày bắt đầu
- Ngày kết thúc

Hệ thống trả về ảnh tương ứng.

---

# FR-07 Tìm kiếm theo AOI

## Mô tả

Người dùng lựa chọn AOI.

Hệ thống tìm kiếm dữ liệu nằm trong vùng đó.

---

# FR-08 Vẽ AOI

## Mô tả

Người dùng có thể:

- Vẽ Polygon
- Vẽ Rectangle

---

# FR-09 Chỉnh sửa AOI

## Mô tả

Cho phép:

- Sửa hình dạng
- Sửa tên
- Sửa mô tả

---

# FR-10 Xóa AOI

## Mô tả

Người dùng xóa AOI đã tạo.

---

# FR-11 Đo khoảng cách

## Mô tả

Người dùng chọn nhiều điểm trên bản đồ.

Hệ thống tính:

- Mét
- Kilomet

---

# FR-12 Đo diện tích

## Mô tả

Người dùng chọn vùng.

Hệ thống tính:

- m²
- ha
- km²

---

# FR-13 Đo chu vi

## Mô tả

Tính tổng chiều dài biên AOI.

---

# FR-14 So sánh ảnh theo thời gian

## Mô tả

Người dùng chọn:

- Khu vực
- Thời điểm A
- Thời điểm B

Hệ thống hiển thị:

- Side-by-side View
- Swipe View

---

# FR-15 Tạo Job xử lý nền

## Mô tả

Người dùng gửi tác vụ:

- AOI Processing
- Detection

Hệ thống tạo Job.

---

# FR-16 Theo dõi trạng thái Job

## Mô tả

Hiển thị:

- Pending
- Running
- Completed
- Failed

---

# FR-17 Realtime Progress

## Mô tả

Hệ thống cập nhật tiến trình theo thời gian thực bằng WebSocket.

---

# FR-18 Object Detection

## Mô tả

Hệ thống hỗ trợ:

- Vehicle Detection
- Ship Detection
- Aircraft Detection

## Mức độ

Optional

---

# FR-19 Hiển thị Detection Result

## Mô tả

Hiển thị:

- Bounding Box
- Confidence Score
- Object Type

---

# FR-20 Đăng nhập

## Mô tả

Người dùng đăng nhập bằng:

- Email
- Password

---

# FR-21 Đăng xuất

## Mô tả

Kết thúc phiên làm việc.

---

# FR-22 Quản lý người dùng

## Mô tả

Chỉ dành cho Admin.

---

# 5. Yêu cầu phi chức năng

---

# NFR-01 Hiệu năng

## Yêu cầu

Thời gian phản hồi API:

≤ 2 giây

---

# NFR-02 Khả năng mở rộng

## Yêu cầu

Cho phép:

- Nhiều Backend Instance
- Nhiều Worker Instance

---

# NFR-03 Tính sẵn sàng

## Yêu cầu

Uptime:

≥ 99%

---

# NFR-04 Bảo mật

## Yêu cầu

- JWT Authentication
- HTTPS
- Password Hashing

---

# NFR-05 Khả năng bảo trì

## Yêu cầu

- Modular Architecture
- Docker Deployment

---

# NFR-06 Khả năng mở rộng dữ liệu

## Yêu cầu

Hỗ trợ thêm:

- Sentinel-1
- Landsat
- PlanetScope

---

# NFR-07 Logging

## Yêu cầu

Ghi log:

- API Requests
- Errors
- Jobs

---

# NFR-08 Monitoring

## Yêu cầu

Theo dõi:

- CPU
- RAM
- Queue
- Database

---

# 6. Giới hạn hệ thống

## Demo Version

- Không xử lý dữ liệu vệ tinh thời gian thực
- Chỉ sử dụng dữ liệu mẫu
- AI Detection ở mức thử nghiệm

---

# 7. Tiêu chí nghiệm thu

Hệ thống được xem là hoàn thành khi:

- Hiển thị được bản đồ
- Hiển thị được ảnh Sentinel
- Tìm kiếm STAC thành công
- AOI hoạt động
- Measurement hoạt động
- Comparison hoạt động
- Async Processing hoạt động
- WebSocket hoạt động

Bonus:

- AI Detection hoạt động

---

# 8. Kết luận

Tài liệu này là cơ sở để:

- Thiết kế kiến trúc
- Thiết kế API
- Thiết kế Database
- Lập kế hoạch phát triển
- Thực hiện kiểm thử hệ thống