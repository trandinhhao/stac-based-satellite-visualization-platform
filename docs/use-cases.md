# use-cases.md

# Đặc tả Use Cases

## 1. Giới thiệu

Tài liệu này mô tả các Use Case chính của hệ thống:

> Nền tảng xử lý và trực quan hóa ảnh vệ tinh hiệu năng cao dựa trên chuẩn STAC

Mỗi Use Case được mô tả theo cấu trúc:

- Use Case ID
- Tên Use Case
- Actor
- Mục tiêu
- Trigger
- Preconditions
- Postconditions
- Main Flow
- Alternative Flow
- Exception Flow

---

# UC01 - Hiển thị bản đồ

## Use Case ID

UC01

## Tên

Hiển thị bản đồ

## Actor

Người dùng

## Mục tiêu

Cho phép người dùng xem bản đồ nền.

## Trigger

Người dùng truy cập hệ thống.

## Preconditions

- Hệ thống hoạt động bình thường.
- Kết nối internet khả dụng.

## Postconditions

- Bản đồ được hiển thị thành công.

---

## Main Flow

1. Người dùng truy cập trang WebGIS.
2. Frontend khởi tạo MapLibre.
3. Frontend tải layer mặc định.
4. Tile được yêu cầu từ Tile Server.
5. TiTiler trả về tile.
6. Frontend render bản đồ.
7. Người dùng nhìn thấy bản đồ.

---

## Alternative Flow

### AF01

4a. Tile đã tồn tại trong Redis.

4a.1 Redis trả về tile.

4a.2 Frontend hiển thị tile.

---

## Exception Flow

### EF01

4e. Tile Server không phản hồi.

4e.1 Hiển thị thông báo lỗi.

---

# UC02 - Tìm kiếm vị trí

## Use Case ID

UC02

## Actor

Người dùng

## Mục tiêu

Tìm kiếm vị trí theo tên hoặc tọa độ.

## Trigger

Người dùng nhập từ khóa tìm kiếm.

## Preconditions

- Bản đồ đã được tải.

## Postconditions

- Bản đồ được di chuyển tới vị trí tương ứng.

---

## Main Flow

1. Người dùng nhập từ khóa.
2. Frontend gửi yêu cầu tìm kiếm.
3. Backend gọi Geocoding Service.
4. Hệ thống trả về danh sách vị trí.
5. Người dùng chọn vị trí.
6. Bản đồ di chuyển tới vị trí đó.

---

## Alternative Flow

### AF01

5a. Có nhiều kết quả.

5a.1 Hiển thị danh sách lựa chọn.

---

## Exception Flow

### EF01

4e. Không tìm thấy địa điểm.

4e.1 Hiển thị thông báo.

---

# UC03 - Tìm kiếm dữ liệu STAC

## Use Case ID

UC03

## Actor

Người dùng

## Mục tiêu

Tìm kiếm ảnh vệ tinh theo không gian và thời gian.

## Trigger

Người dùng thực hiện truy vấn.

## Preconditions

- STAC Service hoạt động.

## Postconditions

- Danh sách ảnh phù hợp được trả về.

---

## Main Flow

1. Người dùng chọn Collection.
2. Người dùng nhập khoảng thời gian.
3. Người dùng xác định AOI.
4. Frontend gửi yêu cầu.
5. Backend gọi STAC API.
6. STAC truy vấn PgSTAC.
7. Kết quả được trả về.
8. Danh sách ảnh hiển thị.

---

## Alternative Flow

### AF01

3a. Người dùng không chọn AOI.

3a.1 Hệ thống sử dụng Bounding Box hiện tại.

---

## Exception Flow

### EF01

6e. Không tìm thấy dữ liệu.

6e.1 Hiển thị thông báo.

---

# UC04 - Tạo AOI

## Use Case ID

UC04

## Actor

Người dùng

## Mục tiêu

Tạo khu vực quan tâm.

## Trigger

Người dùng chọn công cụ AOI.

## Preconditions

- Bản đồ đã hiển thị.

## Postconditions

- AOI được lưu vào hệ thống.

---

## Main Flow

1. Người dùng chọn Draw AOI.
2. Người dùng vẽ Polygon.
3. Frontend sinh GeoJSON.
4. Người dùng nhập tên AOI.
5. Frontend gửi dữ liệu.
6. Backend lưu AOI.
7. Hệ thống trả về ID.
8. AOI hiển thị trên bản đồ.

---

## Alternative Flow

### AF01

2a. Người dùng chọn Rectangle.

2a.1 Hệ thống tạo Polygon tương ứng.

---

## Exception Flow

### EF01

2e. Polygon không hợp lệ.

2e.1 Hiển thị lỗi.

---

# UC05 - Chỉnh sửa AOI

## Use Case ID

UC05

## Actor

Người dùng

## Mục tiêu

Cập nhật AOI.

---

## Main Flow

1. Người dùng chọn AOI.
2. Chọn Edit.
3. Thay đổi hình dạng.
4. Thay đổi thông tin.
5. Lưu thay đổi.
6. Backend cập nhật dữ liệu.

---

# UC06 - Xóa AOI

## Use Case ID

UC06

## Actor

Người dùng

## Mục tiêu

Xóa AOI.

---

## Main Flow

1. Người dùng chọn AOI.
2. Chọn Delete.
3. Hệ thống yêu cầu xác nhận.
4. Người dùng xác nhận.
5. Backend xóa AOI.

---

# UC07 - Đo khoảng cách

## Use Case ID

UC07

## Actor

Người dùng

## Mục tiêu

Tính khoảng cách giữa nhiều điểm.

---

## Main Flow

1. Người dùng chọn Distance Tool.
2. Chọn các điểm trên bản đồ.
3. Frontend sử dụng Turf.js.
4. Khoảng cách được tính toán.
5. Kết quả hiển thị.

---

# UC08 - Đo diện tích

## Use Case ID

UC08

## Actor

Người dùng

## Mục tiêu

Tính diện tích khu vực.

---

## Main Flow

1. Người dùng chọn Area Tool.
2. Vẽ Polygon.
3. Frontend tính diện tích.
4. Hiển thị kết quả.

---

# UC09 - Đo chu vi

## Use Case ID

UC09

## Actor

Người dùng

## Mục tiêu

Tính chu vi AOI.

---

## Main Flow

1. Người dùng chọn Polygon.
2. Hệ thống tính chiều dài các cạnh.
3. Hiển thị chu vi.

---

# UC10 - So sánh ảnh theo thời gian

## Use Case ID

UC10

## Actor

Người dùng

## Mục tiêu

So sánh ảnh tại hai thời điểm.

## Preconditions

- Có ít nhất 2 ảnh hợp lệ.

---

## Main Flow

1. Người dùng chọn AOI.
2. Chọn thời điểm A.
3. Chọn thời điểm B.
4. Frontend gửi yêu cầu.
5. Backend tìm ảnh tương ứng.
6. Trả về 2 ảnh.
7. Frontend mở Compare View.
8. Người dùng kéo thanh trượt để so sánh.

---

## Alternative Flow

### AF01

7a. Chế độ Side-by-Side.

7a.1 Hiển thị hai ảnh cạnh nhau.

---

## Exception Flow

### EF01

5e. Không đủ ảnh.

5e.1 Hiển thị thông báo.

---

# UC11 - Tạo Job Detection

## Use Case ID

UC11

## Actor

Người dùng

## Mục tiêu

Khởi tạo Object Detection.

---

## Preconditions

- AOI hợp lệ.
- Dữ liệu ảnh tồn tại.

---

## Main Flow

1. Người dùng chọn Detect Objects.
2. Chọn loại Detection.
3. Frontend gửi yêu cầu.
4. Backend tạo Job.
5. Job được gửi tới RabbitMQ.
6. Worker nhận Job.
7. Worker thực hiện Detection.
8. Kết quả được lưu.

---

## Postconditions

- Job được tạo.
- Detection Result được lưu.

---

# UC12 - Theo dõi tiến trình Job

## Use Case ID

UC12

## Actor

Người dùng

## Mục tiêu

Theo dõi trạng thái xử lý.

---

## Main Flow

1. Người dùng mở Job Monitor.
2. Frontend kết nối WebSocket.
3. Backend gửi trạng thái.
4. Frontend cập nhật Progress Bar.
5. Người dùng theo dõi tiến trình.

---

## Alternative Flow

### AF01

4a. Job hoàn thành.

4a.1 Hiển thị thông báo thành công.

---

### AF02

4b. Job thất bại.

4b.1 Hiển thị thông báo lỗi.

---

# UC13 - Xem kết quả Detection

## Use Case ID

UC13

## Actor

Người dùng

## Mục tiêu

Xem kết quả nhận dạng.

---

## Preconditions

- Detection Job hoàn thành.

---

## Main Flow

1. Người dùng chọn Detection Result.
2. Frontend tải dữ liệu.
3. Backend trả về danh sách đối tượng.
4. Bounding Boxes hiển thị trên bản đồ.
5. Người dùng xem kết quả.

---

# UC14 - Đăng nhập

## Use Case ID

UC14

## Actor

Người dùng

## Main Flow

1. Người dùng nhập Email.
2. Người dùng nhập Password.
3. Frontend gửi Login Request.
4. Backend xác thực.
5. JWT được sinh ra.
6. Người dùng đăng nhập thành công.

---

# UC15 - Đăng xuất

## Use Case ID

UC15

## Actor

Người dùng

## Main Flow

1. Người dùng chọn Logout.
2. JWT bị xóa khỏi trình duyệt.
3. Phiên làm việc kết thúc.

---

# Tổng kết

Hệ thống hiện có 15 Use Case chính:

| ID | Use Case |
|------|----------|
| UC01 | Hiển thị bản đồ |
| UC02 | Tìm kiếm vị trí |
| UC03 | Tìm kiếm STAC |
| UC04 | Tạo AOI |
| UC05 | Chỉnh sửa AOI |
| UC06 | Xóa AOI |
| UC07 | Đo khoảng cách |
| UC08 | Đo diện tích |
| UC09 | Đo chu vi |
| UC10 | So sánh ảnh |
| UC11 | Detection Job |
| UC12 | Theo dõi Job |
| UC13 | Xem Detection |
| UC14 | Đăng nhập |
| UC15 | Đăng xuất |