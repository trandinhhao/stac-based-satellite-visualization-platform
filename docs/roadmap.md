# Roadmap

## 1. Trạng thái hiện tại

Dự án hiện ở mức prototype/demo kỹ thuật có triển khai end-to-end. Các chức
năng lõi đã chạy:

- Map viewer.
- AOI CRUD.
- Measurement.
- STAC search.
- Job queue.
- Realtime WebSocket.
- AI detection.
- Detection overlay.

Mục tiêu roadmap là đưa dự án từ demo mạnh thành nền tảng ổn định, dễ mở rộng
và có thể triển khai production.

## 2. Mốc 1: Ổn định local deployment

Ưu tiên: rất cao.

Hạng mục:

- Chuẩn hóa `.env.example`.
- Sửa mapping port trong Docker Compose nếu cần.
- Thêm script chạy migration.
- Thêm troubleshooting guide.
- Thêm demo workflow.
- Đảm bảo máy mới clone repo có thể chạy theo README.

Kết quả mong muốn:

- Setup mới không bị lỗi thiếu bảng hoặc sai port.

## 3. Mốc 2: Test và chất lượng

Ưu tiên: cao.

Hạng mục:

- Unit/integration test cho backend.
- Build/lint frontend trong CI.
- Test API AOI.
- Test API measurement.
- Test job state transitions.
- Test detection result endpoint.
- Mock Redis/RabbitMQ hoặc dùng test containers.

Kết quả mong muốn:

- Sửa code tự tin hơn.
- Dễ phát hiện lỗi regression.

## 4. Mốc 3: Refactor frontend map

Ưu tiên: cao.

Hạng mục:

- Tách `MapViewer.tsx`.
- Tách draw modes.
- Tách layer renderers.
- Tách hooks đồng bộ store-map.
- Tạo type GeoJSON rõ hơn.
- Giảm `any` ở các store và component.

Kết quả mong muốn:

- Code frontend dễ đọc, dễ sửa.
- Ít xung đột giữa AOI/STAC/measurement modes.

## 5. Mốc 4: Authentication và authorization

Ưu tiên: trung bình-cao.

Hạng mục:

- User model.
- Register/login.
- JWT access token.
- Password hashing.
- Protected routes.
- Gắn AOI/job theo user.
- Authorization khi đọc/sửa/xóa tài nguyên.

Kết quả mong muốn:

- Hệ thống dùng được cho nhiều người dùng.

## 6. Mốc 5: Production deployment

Ưu tiên: trung bình.

Hạng mục:

- Dockerfile production cho backend.
- Dockerfile production cho frontend static.
- Nginx/Caddy reverse proxy.
- HTTPS.
- Secret manager.
- Structured logging.
- Monitoring.
- Backup database.

Kết quả mong muốn:

- Có thể triển khai server thật an toàn hơn.

## 7. Mốc 6: Nâng cấp STAC/GIS

Ưu tiên: trung bình.

Hạng mục:

- Ingest STAC items vào PgSTAC.
- Quản lý collections nội bộ.
- Search by AOI endpoint.
- Temporal comparison.
- Raster statistics.
- Clip/crop imagery theo AOI.
- Export GeoJSON/CSV cho detection.

Kết quả mong muốn:

- Hệ thống trở thành công cụ phân tích ảnh vệ tinh hoàn chỉnh hơn.

## 8. Mốc 7: Nâng cấp AI

Ưu tiên: trung bình.

Hạng mục:

- Quản lý model registry.
- Worker GPU.
- Batch inference.
- Confidence threshold tùy chỉnh trên UI.
- Class filter.
- Lưu version model vào detection result.
- Đánh giá chất lượng detection.

Kết quả mong muốn:

- Pipeline AI minh bạch, dễ kiểm soát và có thể cải thiện chất lượng.

## 9. Mốc 8: Báo cáo và dashboard

Ưu tiên: thấp-trung bình.

Hạng mục:

- Dashboard tổng số AOI/job/detection.
- Biểu đồ job status.
- Báo cáo theo AOI.
- Export PDF/CSV.
- Lịch sử phân tích.

Kết quả mong muốn:

- Dễ trình bày kết quả phân tích cho người dùng cuối.

## 10. Nguyên tắc ưu tiên

Nên ưu tiên theo thứ tự:

1. Chạy ổn.
2. Dữ liệu đúng.
3. Code dễ bảo trì.
4. Bảo mật.
5. Mở rộng tính năng.
6. Tối ưu hiệu năng.

