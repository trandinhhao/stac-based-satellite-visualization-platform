# Tổng quan dự án

## 1. Giới thiệu

STAC-Based Satellite Visualization Platform là một nền tảng web GIS phục vụ
việc trực quan hóa, tìm kiếm và xử lý dữ liệu ảnh vệ tinh. Hệ thống kết hợp bản
đồ tương tác, chuẩn dữ liệu STAC, PostGIS, xử lý nền bằng Celery và pipeline AI
detection để tạo ra một môi trường làm việc thống nhất cho các bài toán giám
sát không gian.

Dự án hướng tới các kịch bản như:

- Tìm ảnh vệ tinh theo vùng và thời gian.
- Đánh dấu vùng quan tâm trên bản đồ.
- Tính toán diện tích, chu vi và khoảng cách.
- Chạy tác vụ phân tích nền.
- Nhận diện đối tượng trên ảnh vệ tinh.
- Theo dõi tiến trình xử lý theo thời gian thực.

## 2. Bối cảnh

Dữ liệu vệ tinh hiện đại thường có khối lượng lớn, nhiều nguồn, nhiều định dạng
và phân tán trên nhiều dịch vụ. Nếu người dùng phải tải toàn bộ ảnh GeoTIFF về
máy để xem hoặc xử lý thủ công, quy trình sẽ chậm và khó mở rộng. Chuẩn STAC
giúp mô tả dữ liệu ảnh vệ tinh theo một cấu trúc thống nhất gồm catalog,
collection, item và asset. TiTiler và COG giúp render ảnh lớn thành tile nhỏ để
trình duyệt có thể hiển thị mượt.

Dự án này tận dụng các công nghệ trên để tạo một hệ thống có thể chạy local bằng
Docker Compose nhưng vẫn mô phỏng đúng kiến trúc của một nền tảng GIS hiện đại.

## 3. Mục tiêu

Các mục tiêu chính:

- Cung cấp giao diện bản đồ trực quan bằng React và MapLibre GL.
- Cho phép người dùng quản lý AOI dưới dạng GeoJSON Polygon.
- Lưu trữ dữ liệu hình học bằng PostgreSQL/PostGIS.
- Tích hợp STAC search để truy vấn dữ liệu ảnh vệ tinh.
- Cung cấp cơ chế cache bằng Redis.
- Chạy tác vụ nặng bằng Celery worker và RabbitMQ.
- Cập nhật tiến trình job qua WebSocket.
- Tích hợp pipeline YOLO để nhận diện máy bay, tàu và xe.

## 4. Phạm vi hiện tại

Các chức năng đã được triển khai trong code:

- Bản đồ toàn màn hình.
- Chuyển lớp bản đồ nền.
- Tìm kiếm vị trí.
- Vẽ polygon, rectangle, circle.
- CRUD AOI.
- Import/export AOI GeoJSON.
- Đo khoảng cách, diện tích và chu vi.
- STAC collection và item search.
- Planet tile/thumbnail proxy.
- Job management.
- AI detection job.
- Redis Pub/Sub và WebSocket realtime.
- Hiển thị detection bounding boxes trên bản đồ.

Các chức năng ở mức định hướng, chưa phải phần hoàn chỉnh trong code:

- Authentication và phân quyền người dùng.
- Dashboard thống kê hệ thống.
- Temporal comparison đầy đủ.
- Multi-tenant.
- Production deployment bằng Kubernetes.
- Quản lý dữ liệu STAC ingest hoàn chỉnh từ nhiều nguồn.

## 5. Người dùng mục tiêu

Hệ thống phù hợp với:

- Sinh viên hoặc nhóm nghiên cứu GIS/viễn thám.
- Nhà phát triển cần prototype nền tảng STAC.
- Người làm phân tích ảnh vệ tinh cần giao diện demo nhanh.
- Nhóm cần thử nghiệm pipeline AI detection trên ảnh bản đồ.
- Đồ án kỹ thuật về kiến trúc web GIS và xử lý bất đồng bộ.

## 6. Thành phần chính

| Thành phần | Vai trò |
| --- | --- |
| Frontend | Giao diện bản đồ và công cụ thao tác |
| Backend | API, WebSocket, điều phối nghiệp vụ |
| Worker | Xử lý tác vụ nền và AI detection |
| PostgreSQL/PostGIS/PgSTAC | Lưu dữ liệu nghiệp vụ, hình học và metadata STAC |
| Redis | Cache, result backend, Pub/Sub |
| RabbitMQ | Message broker |
| STAC FastAPI | Dịch vụ STAC API |
| TiTiler | Dịch vụ raster/tile |

## 7. Giá trị của dự án

Điểm mạnh của dự án nằm ở việc không chỉ dựng một giao diện bản đồ tĩnh mà còn
tạo được một luồng xử lý tương đối hoàn chỉnh:

```text
Vẽ AOI -> Lưu PostGIS -> Tạo Job -> Celery Worker -> AI Detection
        -> Lưu kết quả -> Redis Pub/Sub -> WebSocket -> Hiển thị trên bản đồ
```

Luồng này thể hiện các thành phần quan trọng của một nền tảng xử lý ảnh vệ tinh:

- Quản lý dữ liệu không gian.
- Xử lý bất đồng bộ.
- Giao tiếp realtime.
- Tích hợp AI.
- Hiển thị kết quả địa lý.

## 8. Giới hạn hiện tại

Một số giới hạn cần biết:

- Hệ thống chưa có đăng nhập/người dùng thật.
- Dockerfile hiện thiên về môi trường development.
- Migration chưa được tự động chạy khi compose khởi động.
- Một số API trong tài liệu định hướng chưa được implement đầy đủ.
- Frontend có component `MapViewer.tsx` rất lớn, nên refactor khi dự án mở rộng.
- AI detection phụ thuộc vào model weights và chất lượng ảnh nền.

## 9. Định hướng phát triển

Các hướng phát triển hợp lý tiếp theo:

- Hoàn thiện authentication bằng JWT.
- Tách Docker Compose dev và production.
- Thêm migration runner.
- Thêm test backend cho AOI, measurement và jobs.
- Refactor frontend map logic.
- Thêm ingest STAC data.
- Thêm temporal comparison thật.
- Thêm export report.
- Tối ưu AI worker cho GPU.

