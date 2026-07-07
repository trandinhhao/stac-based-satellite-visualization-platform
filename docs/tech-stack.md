# Công nghệ sử dụng

## 1. Tổng quan

Dự án kết hợp các công nghệ web hiện đại với hệ sinh thái GIS mã nguồn mở.
Stack hiện tại được chọn để cân bằng giữa khả năng triển khai nhanh, dễ demo,
khả năng mở rộng và mức độ phù hợp với dữ liệu vệ tinh.

## 2. Bảng công nghệ

| Lớp | Công nghệ | Vai trò |
| --- | --- | --- |
| Frontend | React 19 | Xây dựng giao diện người dùng |
| Frontend | TypeScript | Kiểu dữ liệu và an toàn khi phát triển |
| Frontend | Vite | Dev server, build tool, proxy |
| Frontend GIS | MapLibre GL | Render bản đồ |
| Frontend GIS | Mapbox GL Draw | Vẽ/chỉnh sửa geometry |
| Frontend GIS | Turf.js | Tính toán geometry phía client |
| State | Zustand | Quản lý state |
| HTTP | Axios | Gọi API |
| UI | Tailwind CSS, MUI, Lucide | Styling, component và icon |
| Backend | FastAPI | REST API và WebSocket |
| Backend | SQLAlchemy | ORM và database session |
| Backend | Pydantic | Validate request/response |
| Migration | Alembic | Quản lý schema database |
| Database | PostgreSQL | Database quan hệ |
| Spatial | PostGIS | Geometry, geography, spatial index |
| STAC DB | PgSTAC | Lưu metadata STAC |
| STAC API | stac-fastapi-pgstac | STAC API service |
| Raster | TiTiler | Tile/raster service |
| Cache | Redis | Cache, result backend, Pub/Sub |
| Queue | RabbitMQ | Message broker |
| Worker | Celery | Background task |
| AI | Ultralytics YOLO | Object detection |
| Image | Pillow, OpenCV | Xử lý ảnh |
| Container | Docker, Docker Compose | Đóng gói và vận hành local |

## 3. Frontend

### React và TypeScript

React được dùng để xây dựng giao diện component. TypeScript giúp mô tả dữ liệu
như AOI, Job, Detection và STAC item. Một số vùng code quanh Mapbox Draw vẫn
dùng `any` vì type của thư viện không bao phủ đầy đủ custom mode.

### Vite

Vite cung cấp:

- Dev server nhanh.
- Hot Module Replacement.
- Build frontend.
- Proxy `/api`, `/ws`, `/stac`, `/cog` tới các service Docker.

### MapLibre GL

MapLibre GL là thư viện render bản đồ vector/raster trên WebGL. Dự án dùng
MapLibre để:

- Hiển thị basemap.
- Thêm source/layer AOI.
- Hiển thị STAC overlay.
- Hiển thị detection bounding boxes.
- Điều khiển camera, fit bounds, zoom.

### Mapbox GL Draw

Mapbox Draw được dùng để vẽ geometry trên bản đồ. Dự án mở rộng bằng custom
mode cho:

- Rectangle.
- Circle.
- Direct select behavior cho circle/AOI/STAC geometry.

### Zustand

Zustand được chọn vì nhẹ, dễ chia store theo domain và ít boilerplate. Với ứng
dụng bản đồ có nhiều state tương tác, Zustand giúp các component đọc/ghi state
trực tiếp mà không cần reducer phức tạp.

## 4. Backend

### FastAPI

FastAPI cung cấp:

- REST API.
- WebSocket.
- Swagger docs tự động.
- Dependency injection cho database session.
- Validate dữ liệu bằng Pydantic.

### SQLAlchemy và Alembic

SQLAlchemy quản lý kết nối database và model. Alembic quản lý migration cho
các bảng ứng dụng. Một số query dùng SQL thô vì cần gọi hàm PostGIS trực tiếp.

### Pydantic

Pydantic dùng cho schema request/response, đặc biệt ở AOI và Job API. Pydantic
v2 đang được sử dụng theo dependency hiện tại.

## 5. GIS và dữ liệu vệ tinh

### STAC

STAC là chuẩn mô tả dữ liệu không gian-thời gian. STAC giúp mô tả:

- Collection.
- Item.
- Asset.
- Geometry.
- Datetime.
- Metadata.

Backend có endpoint `/api/v1/stac/search` để tìm kiếm dữ liệu theo collection,
datetime, bbox và geometry.

### PgSTAC

PgSTAC lưu metadata STAC trong PostgreSQL. Image database trong Docker Compose
đã tích hợp PgSTAC và PostGIS.

### TiTiler

TiTiler là service raster/tile. Trong kiến trúc, TiTiler phục vụ việc render
ảnh raster lớn thành tile nhỏ cho frontend. Vite proxy path `/cog` tới TiTiler.

### PostGIS

PostGIS được dùng mạnh trong phần AOI và measurement:

- Lưu geometry Polygon SRID 4326.
- Tính diện tích bằng geography.
- Tính chu vi bằng geography.
- Tạo spatial index GiST.

## 6. Xử lý bất đồng bộ

### RabbitMQ

RabbitMQ là broker cho Celery. Backend đưa task vào queue, worker consume task
và xử lý độc lập với request HTTP.

### Celery

Celery chạy task AI detection. Lợi ích:

- Không block FastAPI request.
- Có retry.
- Có task id.
- Có thể scale worker.

### Redis

Redis dùng cho ba mục đích:

- Cache STAC collections/search results.
- Celery result backend.
- Pub/Sub channel `job_updates`.

## 7. AI stack

Pipeline AI dùng:

- `ultralytics` cho YOLO.
- `Pillow` để mở/ghép ảnh.
- `requests` để tải tile.
- `opencv-python-headless` cho xử lý ảnh khi cần.

Pipeline có cơ chế fallback mock để demo vẫn chạy được nếu thiếu model hoặc
thư viện ML.

## 8. Docker

Docker Compose định nghĩa 8 service:

- `postgis`
- `stac-fastapi`
- `titiler`
- `redis`
- `rabbitmq`
- `backend`
- `worker`
- `frontend`

Dockerfile hiện tại thiên về development. Backend chạy `uvicorn --reload`,
frontend chạy Vite dev server. Production nên có Dockerfile riêng.

## 9. Lý do lựa chọn stack

Stack này phù hợp vì:

- Tất cả công nghệ chính đều phổ biến trong GIS/web.
- Có thể chạy end-to-end bằng Docker Compose.
- STAC/PgSTAC/TiTiler là bộ công cụ chuẩn cho dữ liệu vệ tinh.
- FastAPI và React giúp phát triển nhanh.
- Celery/RabbitMQ/Redis là pattern quen thuộc cho background job.
- MapLibre tránh phụ thuộc license thương mại của Mapbox GL JS.

