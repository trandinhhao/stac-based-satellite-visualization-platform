# tech-stack.md

# Công nghệ sử dụng

## 1. Mục tiêu lựa chọn công nghệ

Việc lựa chọn công nghệ cho dự án dựa trên các tiêu chí:

* Mã nguồn mở (Open Source)
* Dễ triển khai
* Dễ mở rộng
* Phù hợp với hệ sinh thái GIS hiện đại
* Hiệu năng tốt
* Có cộng đồng hỗ trợ lớn
* Tương thích với chuẩn STAC

---

# 2. Tổng quan Tech Stack

| Thành phần        | Công nghệ          |
| ----------------- | ------------------ |
| Frontend          | React + TypeScript |
| Build Tool        | Vite               |
| GIS Frontend      | MapLibre GL JS     |
| State Management  | Zustand            |
| Backend API       | FastAPI            |
| ORM               | SQLAlchemy         |
| Validation        | Pydantic           |
| Database          | PostgreSQL         |
| STAC Database     | PgSTAC             |
| STAC API          | stac-fastapi       |
| Tile Server       | TiTiler            |
| Cache             | Redis              |
| Message Queue     | RabbitMQ           |
| Background Worker | Celery             |
| AI Framework      | PyTorch            |
| Object Detection  | YOLO               |
| Containerization  | Docker             |
| Orchestration     | Docker Compose     |

---

# 3. Frontend Technologies

## 3.1 React

### Vai trò

Xây dựng giao diện người dùng.

### Lý do lựa chọn

* Phổ biến
* Cộng đồng lớn
* Dễ mở rộng
* Hỗ trợ SPA
* Dễ tích hợp với MapLibre

### Ứng dụng trong dự án

* Map Viewer
* Layer Manager
* AOI Tools
* Dashboard
* Detection Viewer

---

## 3.2 TypeScript

### Vai trò

Tăng độ an toàn khi phát triển frontend.

### Lợi ích

* Kiểm tra kiểu dữ liệu
* Giảm lỗi runtime
* Dễ bảo trì
* Hỗ trợ IDE tốt

---

## 3.3 Vite

### Vai trò

Build Tool cho React.

### Lý do lựa chọn

* Startup nhanh
* HMR nhanh
* Build tối ưu
* Cấu hình đơn giản

---

## 3.4 MapLibre GL JS

### Vai trò

Thư viện hiển thị bản đồ.

### Lý do lựa chọn

* Mã nguồn mở hoàn toàn
* Tương thích Mapbox Style
* Hỗ trợ vector tile
* Hiệu năng cao

### Chức năng

* Render bản đồ
* Layer Management
* Zoom/Pan
* Overlay dữ liệu

---

## 3.5 Turf.js

### Vai trò

Xử lý dữ liệu không gian phía frontend.

### Chức năng

* Tính diện tích
* Tính khoảng cách
* Tính chu vi
* Xử lý GeoJSON

---

## 3.6 Zustand

### Vai trò

State Management.

### Lý do lựa chọn

So với Redux:

* Nhẹ hơn
* Dễ học hơn
* Ít boilerplate
* Đủ cho quy mô dự án

---

# 4. Backend Technologies

## 4.1 FastAPI

### Vai trò

REST API Server.

### Lý do lựa chọn

* Hiệu năng cao
* Hỗ trợ async
* Tự động sinh Swagger
* Tích hợp tốt với Python GIS Ecosystem

### Chức năng

* Authentication
* AOI Management
* Job Management
* WebSocket

---

## 4.2 SQLAlchemy

### Vai trò

ORM cho PostgreSQL.

### Lợi ích

* Quản lý database bằng Python
* Hỗ trợ migration
* Dễ mở rộng

---

## 4.3 Pydantic

### Vai trò

Validation dữ liệu.

### Chức năng

* Request Validation
* Response Validation
* DTO Mapping

---

# 5. GIS Technologies

## 5.1 STAC

### STAC là gì?

STAC (SpatioTemporal Asset Catalog) là tiêu chuẩn mô tả dữ liệu địa lý theo:

* Không gian
* Thời gian
* Metadata

### Vai trò

Chuẩn hóa dữ liệu ảnh vệ tinh.

---

## 5.2 PgSTAC

### Vai trò

Lưu trữ dữ liệu STAC trên PostgreSQL.

### Chức năng

* Collections
* Items
* Assets
* Spatial Query
* Temporal Query

### Lợi ích

* Hiệu năng cao
* Chuẩn STAC
* Dễ tích hợp

---

## 5.3 STAC FastAPI

### Vai trò

Cung cấp STAC API.

### API hỗ trợ

```http
GET /collections

GET /collections/{id}

GET /search

GET /items
```

### Lợi ích

* Tuân thủ chuẩn STAC API
* Tương thích hệ sinh thái STAC

---

## 5.4 TiTiler

### Vai trò

Tile Server.

### Chức năng

* Render GeoTIFF
* Sinh Tile
* Crop AOI
* Statistics

### Lợi ích

Không cần xử lý toàn bộ GeoTIFF trên frontend.

Ví dụ:

```text
GeoTIFF 3GB
    ↓
TiTiler
    ↓
256x256 Tile
    ↓
Browser
```

---

# 6. Database Technologies

## 6.1 PostgreSQL

### Vai trò

Database chính.

### Lưu trữ

* Users
* AOIs
* Jobs
* Detection Results

### Lý do lựa chọn

* Ổn định
* Open Source
* Hỗ trợ PostGIS

---

## 6.2 PostGIS

### Vai trò

Spatial Extension cho PostgreSQL.

### Chức năng

* Geometry
* Polygon
* Spatial Query

Ví dụ:

```sql
SELECT *
FROM aois
WHERE ST_Contains(...)
```

---

# 7. Caching Layer

## Redis

### Vai trò

In-Memory Cache.

### Dữ liệu Cache

* Map Tiles
* Search Results
* Metadata
* Session Data

### Lợi ích

* Giảm tải database
* Tăng tốc phản hồi

---

# 8. Message Queue

## RabbitMQ

### Vai trò

Điều phối tác vụ bất đồng bộ.

### Tác vụ

* AOI Processing
* AI Detection
* Data Extraction
* Report Generation

### Lý do lựa chọn

So với Kafka:

| RabbitMQ          | Kafka             |
| ----------------- | ----------------- |
| Dễ triển khai     | Phức tạp hơn      |
| Phù hợp Job Queue | Phù hợp Streaming |
| Nhẹ               | Nặng hơn          |

Đối với dự án hiện tại RabbitMQ phù hợp hơn.

---

# 9. Background Processing

## Celery

### Vai trò

Worker Framework.

### Chức năng

* Consume Queue
* Xử lý nền
* Retry Task

### Kết hợp

```text
RabbitMQ
    ↓
Celery
    ↓
Worker
```

---

# 10. AI Technologies

## PyTorch

### Vai trò

Deep Learning Framework.

### Lý do lựa chọn

* Phổ biến
* Nhiều mô hình GIS
* Dễ triển khai

---

## YOLO

### Vai trò

Object Detection.

### Chức năng

* Vehicle Detection
* Ship Detection
* Aircraft Detection

### Kết quả

```json
{
  "class": "vehicle",
  "confidence": 0.95,
  "bbox": [...]
}
```

---

# 11. Realtime Technologies

## WebSocket

### Vai trò

Giao tiếp thời gian thực.

### Chức năng

* Job Progress
* Detection Status
* Notification

Ví dụ:

```text
Job Started

10%
25%
50%
75%
100%
```

---

# 12. Containerization

## Docker

### Vai trò

Đóng gói ứng dụng.

### Thành phần Container

* Frontend
* Backend
* Worker
* PostgreSQL
* Redis
* RabbitMQ
* TiTiler

---

## Docker Compose

### Vai trò

Quản lý môi trường phát triển.

### Lợi ích

* Dễ triển khai
* Đồng nhất môi trường
* Dễ chia sẻ trong nhóm

---

# 13. Công nghệ dự phòng

Trong tương lai có thể mở rộng:

| Hiện tại       | Tương lai          |
| -------------- | ------------------ |
| React          | Next.js            |
| RabbitMQ       | Kafka              |
| Docker Compose | Kubernetes         |
| PostgreSQL     | PostgreSQL Cluster |
| Redis          | Redis Cluster      |
| Single Worker  | Worker Pool        |

---

# 14. Kết luận

Bộ công nghệ được lựa chọn đảm bảo:

* Phù hợp với yêu cầu đề tài
* Tuân thủ chuẩn STAC
* Hỗ trợ GIS hiện đại
* Dễ mở rộng
* Dễ triển khai
* Tương thích với kiến trúc Cloud Native

Đồng thời tạo nền tảng thuận lợi để phát triển thêm các tính năng AI và xử lý dữ liệu vệ tinh trong tương lai.
