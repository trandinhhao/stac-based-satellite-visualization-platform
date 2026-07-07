# Use Cases

## 1. Tổng quan

Tài liệu này mô tả các use case chính mà hệ thống hiện hỗ trợ hoặc hướng tới.
Mỗi use case gồm actor, tiền điều kiện, luồng chính và kết quả.

## 2. UC-01: Xem bản đồ vệ tinh

Actor: Người dùng.

Tiền điều kiện:

- Frontend chạy.
- Các lớp bản đồ nền truy cập được.

Luồng chính:

1. Người dùng mở ứng dụng.
2. Hệ thống tải bản đồ mặc định.
3. Người dùng pan/zoom.
4. Người dùng chuyển lớp bản đồ nếu cần.

Kết quả:

- Người dùng xem được khu vực quan tâm trên bản đồ.

## 3. UC-02: Tìm kiếm địa điểm

Actor: Người dùng.

Tiền điều kiện:

- Có kết nối tới dịch vụ geocoding.

Luồng chính:

1. Người dùng mở tab tìm kiếm.
2. Nhập tên địa điểm.
3. Hệ thống gọi geocoding API.
4. Người dùng chọn kết quả.
5. Bản đồ di chuyển tới vị trí đó.

Kết quả:

- Bản đồ định vị đến địa điểm cần quan sát.

## 4. UC-03: Tạo AOI

Actor: Người dùng phân tích GIS.

Tiền điều kiện:

- Backend và database hoạt động.
- Migration đã chạy.

Luồng chính:

1. Người dùng mở tab AOI.
2. Chọn kiểu vẽ.
3. Vẽ vùng trên bản đồ.
4. Nhập tên và mô tả.
5. Gửi yêu cầu lưu.
6. Backend tính diện tích/chu vi.
7. Backend lưu AOI vào PostGIS.
8. Frontend render AOI.

Kết quả:

- AOI được lưu và có thể dùng cho search hoặc detection.

## 5. UC-04: Import AOI từ GeoJSON

Actor: Người dùng GIS.

Tiền điều kiện:

- Có file GeoJSON hợp lệ.

Luồng chính:

1. Người dùng chọn import.
2. Upload file.
3. Backend đọc file.
4. Backend trích xuất geometry.
5. Backend validate Polygon.
6. Backend lưu AOI.

Kết quả:

- AOI từ file được thêm vào hệ thống.

## 6. UC-05: Export AOI

Actor: Người dùng GIS.

Tiền điều kiện:

- AOI tồn tại trong hệ thống.

Luồng chính:

1. Người dùng chọn AOI.
2. Bấm export.
3. Backend trả GeoJSON Feature.
4. Trình duyệt tải file.

Kết quả:

- Người dùng có file GeoJSON để chia sẻ hoặc dùng trong phần mềm GIS khác.

## 7. UC-06: Đo khoảng cách

Actor: Người dùng phân tích.

Luồng chính:

1. Mở tab đo đạc.
2. Chọn đo khoảng cách.
3. Vẽ LineString.
4. Hệ thống tính tổng độ dài và từng đoạn.

Kết quả:

- Người dùng biết khoảng cách thực tế giữa các điểm.

## 8. UC-07: Đo diện tích

Actor: Người dùng phân tích.

Luồng chính:

1. Mở tab đo đạc.
2. Chọn đo diện tích.
3. Vẽ Polygon.
4. Hệ thống tính diện tích, chu vi và cạnh.

Kết quả:

- Người dùng biết diện tích và chu vi vùng quan tâm.

## 9. UC-08: Tìm ảnh vệ tinh bằng STAC

Actor: Người dùng phân tích ảnh vệ tinh.

Tiền điều kiện:

- STAC service hoặc nguồn dữ liệu search hoạt động.

Luồng chính:

1. Người dùng mở tab STAC.
2. Chọn collection.
3. Chọn thời gian.
4. Chọn bbox hoặc geometry.
5. Gửi search.
6. Backend normalize filter và kiểm tra cache.
7. Backend gọi STAC search.
8. Frontend hiển thị kết quả.

Kết quả:

- Người dùng có danh sách ảnh phù hợp vùng và thời gian.

## 10. UC-09: Chọn ảnh STAC để xem trên bản đồ

Actor: Người dùng.

Luồng chính:

1. Người dùng chọn item trong kết quả STAC.
2. Frontend lưu item vào `useSTACStore`.
3. MapViewer render overlay hoặc indicator.

Kết quả:

- Người dùng so sánh/xem nhanh ảnh liên quan trên bản đồ.

## 11. UC-10: Chạy AI detection

Actor: Người dùng phân tích.

Tiền điều kiện:

- Có AOI.
- Worker đang chạy.
- RabbitMQ, Redis và database hoạt động.

Luồng chính:

1. Người dùng mở tab AI.
2. Chọn AOI.
3. Tạo detection job.
4. Backend ghi job vào DB.
5. Backend gửi task vào RabbitMQ.
6. Worker xử lý detection.
7. Worker lưu kết quả.
8. Frontend nhận progress realtime.
9. Frontend hiển thị kết quả.

Kết quả:

- Các object được nhận diện và vẽ lên bản đồ.

## 12. UC-11: Hủy job

Actor: Người dùng.

Tiền điều kiện:

- Job đang queued/running.

Luồng chính:

1. Người dùng bấm cancel.
2. Backend kiểm tra trạng thái job.
3. Backend revoke Celery task.
4. Backend cập nhật status `cancelled`.
5. Frontend cập nhật danh sách job.

Kết quả:

- Job không tiếp tục xử lý.

## 13. UC-12: Theo dõi tiến trình realtime

Actor: Người dùng.

Luồng chính:

1. Frontend kết nối WebSocket.
2. Worker publish tiến trình vào Redis.
3. Backend broadcast event.
4. Frontend cập nhật job widget.

Kết quả:

- Người dùng thấy tiến trình xử lý gần thời gian thực.

