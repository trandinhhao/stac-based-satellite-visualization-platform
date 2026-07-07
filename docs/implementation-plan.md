# Kế hoạch triển khai và phát triển

## 1. Mục tiêu tài liệu

Tài liệu này mô tả cách dự án đã được triển khai theo các giai đoạn chức năng
và đề xuất kế hoạch phát triển tiếp theo. Đây không phải lịch cứng, mà là bản
định hướng kỹ thuật để nhóm có thể tiếp tục nâng cấp hệ thống có kiểm soát.

## 2. Giai đoạn đã hoàn thành

### Giai đoạn 1: Khung dự án

Đã thực hiện:

- Tạo cấu trúc `frontend/`, `backend/`, `docs/`.
- Tạo Docker Compose.
- Thêm PostgreSQL/PostGIS/PgSTAC.
- Thêm Redis.
- Thêm RabbitMQ.
- Thêm STAC FastAPI.
- Thêm TiTiler.
- Tạo frontend Vite React TypeScript.
- Tạo backend FastAPI.

Kết quả:

- Hệ thống có thể chạy nhiều service trong một Docker network.

### Giai đoạn 2: Bản đồ frontend

Đã thực hiện:

- Tích hợp MapLibre GL.
- Tạo layout bản đồ toàn màn hình.
- Tạo navigation rail và drawer.
- Tạo layer switcher.
- Hiển thị tọa độ và zoom.
- Quản lý map state bằng Zustand.

Kết quả:

- Người dùng có giao diện bản đồ tương tác.

### Giai đoạn 3: AOI management

Đã thực hiện:

- Tạo bảng `aois`.
- Tạo model AOI.
- Tạo API CRUD AOI.
- Tính diện tích/chu vi bằng PostGIS.
- Vẽ polygon/rectangle/circle trên frontend.
- Lưu AOI và render lại trên bản đồ.
- Import/export GeoJSON.

Kết quả:

- Người dùng quản lý được vùng quan tâm.

### Giai đoạn 4: Measurement

Đã thực hiện:

- Tạo endpoint `/api/v1/measure`.
- Tính LineString length bằng PostGIS.
- Tính Polygon area/perimeter bằng PostGIS.
- Tạo MeasurementPanel.
- Hiển thị kết quả đo và lịch sử đo.

Kết quả:

- Người dùng đo được khoảng cách, diện tích, chu vi.

### Giai đoạn 5: STAC search

Đã thực hiện:

- Tạo STAC service layer.
- Tạo API collections và search.
- Normalize datetime.
- Cache Redis cho collection và search result.
- Tạo STACSearchPanel.
- Cho phép chọn STAC item.

Kết quả:

- Người dùng tìm được dữ liệu ảnh vệ tinh theo filter.

### Giai đoạn 6: Background jobs

Đã thực hiện:

- Tạo bảng `jobs`.
- Tạo API jobs.
- Cấu hình Celery.
- Cấu hình RabbitMQ broker.
- Cấu hình Redis result backend.
- Tạo FloatingJobsWidget.

Kết quả:

- Hệ thống quản lý được tác vụ nền.

### Giai đoạn 7: Realtime WebSocket

Đã thực hiện:

- Tạo WebSocket endpoint `/ws/jobs`.
- Tạo connection manager.
- Worker publish event qua Redis.
- Backend listen Redis Pub/Sub.
- Frontend nhận event và cập nhật job store.
- Thêm polling fallback.

Kết quả:

- Người dùng theo dõi tiến trình job realtime.

### Giai đoạn 8: AI detection

Đã thực hiện:

- Tạo bảng `detections`.
- Tạo API `/detections`.
- Tạo Celery task `process_detection_task`.
- Tạo pipeline `run_real_detection`.
- Tích hợp YOLO/fallback/mock.
- Lưu detection vào DB.
- Render bounding boxes trên bản đồ.

Kết quả:

- Hệ thống có luồng AI detection end-to-end.

## 3. Việc nên làm ngay

Ưu tiên cao:

- Tự động hóa migration trong quy trình chạy/deploy.
- Tách Docker config dev và production.
- Thêm backend tests cho AOI, measure, jobs, detections.
- Sửa docs/API để luôn khớp code.
- Kiểm tra lại port mapping trong Docker Compose.

Ưu tiên trung bình:

- Refactor `MapViewer.tsx`.
- Tăng type safety frontend.
- Chuẩn hóa error response backend.
- Thêm empty/loading/error states rõ hơn.
- Thêm confirm dialog cho thao tác nguy hiểm.

Ưu tiên thấp:

- Tối ưu UI mobile.
- Thêm dashboard thống kê.
- Thêm report export.

## 4. Lộ trình đề xuất

### Sprint A: Ổn định nền tảng

Mục tiêu:

- Dự án chạy ổn trên máy mới.
- Không cần thao tác thủ công quá nhiều.

Tasks:

- Thêm migration runner hoặc hướng dẫn bắt buộc rõ hơn.
- Sửa Docker Compose port mapping.
- Thêm healthcheck backend/redis/rabbitmq nếu cần.
- Thêm seed/demo data nếu phù hợp.
- Rà `.env.example`.

### Sprint B: Kiểm thử và chất lượng code

Mục tiêu:

- Giảm regression khi sửa.

Tasks:

- Test AOI create/update/delete.
- Test measurement.
- Test job create/cancel.
- Test detection result behavior.
- Chạy frontend build/lint ổn định.
- Tách helper logic dễ test.

### Sprint C: Refactor frontend map

Mục tiêu:

- Giảm độ phức tạp của `MapViewer.tsx`.

Tasks:

- Tách custom draw modes.
- Tách layer rendering.
- Tách event handlers.
- Tách measurement logic.
- Tách AOI/STAC/detection sync hooks.

### Sprint D: Bảo mật và người dùng

Mục tiêu:

- Chuẩn bị production.

Tasks:

- Thêm user model.
- Thêm register/login.
- JWT auth.
- Gắn user_id vào AOI/jobs.
- Authorization cho tài nguyên.
- Rate limit.

### Sprint E: Nâng cấp AI/GIS

Mục tiêu:

- Tăng giá trị phân tích.

Tasks:

- Quản lý model weights rõ ràng.
- Tối ưu GPU worker.
- Thêm batch detection.
- Thêm export detection result.
- Thêm temporal comparison.
- Thêm ingest STAC data.

## 5. Tiêu chí hoàn thành production-ready

- Có authentication.
- Có migration tự động.
- Có test coverage cho API chính.
- Có Dockerfile production.
- Có reverse proxy HTTPS.
- Có logging/monitoring.
- Có backup database.
- Có quản lý secrets.
- Có tài liệu vận hành.
- Có quy trình deploy lặp lại được.

