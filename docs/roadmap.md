# roadmap.md

# Lộ trình phát triển dự án

## Thông tin chung

### Tên dự án

Nền tảng xử lý và trực quan hóa ảnh vệ tinh hiệu năng cao dựa trên chuẩn STAC

### Thời gian thực hiện

10 tuần

### Mô hình phát triển

Agile Scrum

### Sprint Length

1 tuần / Sprint

---

# Mục tiêu tổng thể

Xây dựng nền tảng WebGIS hỗ trợ:

- Hiển thị ảnh vệ tinh
- STAC Search
- AOI Management
- Measurement Tools
- Temporal Comparison
- Async Processing
- Realtime Updates
- AI Detection (Optional)

---

# Các mốc quan trọng

| Milestone | Mô tả |
|------------|---------|
| M1 | Hoàn thành kiến trúc hệ thống |
| M2 | Hoàn thành WebGIS cơ bản |
| M3 | Hoàn thành STAC Integration |
| M4 | Hoàn thành AOI Tools |
| M5 | Hoàn thành Comparison |
| M6 | Hoàn thành Async Processing |
| M7 | Hoàn thành Realtime Tracking |
| M8 | Hoàn thành AI Detection |
| M9 | Hoàn thành Testing |
| M10 | Demo cuối kỳ |

---

# Sprint Roadmap

---

# Sprint 0

## Tuần 1

### Mục tiêu

Khởi tạo dự án.

### Công việc

#### Project Setup

- Tạo Git Repository
- Thiết lập Branch Strategy
- Thiết lập Coding Convention

#### Development Environment

- Docker
- Docker Compose
- PostgreSQL
- Redis
- RabbitMQ

#### Frontend

- React
- TypeScript
- Vite

#### Backend

- FastAPI
- SQLAlchemy
- Alembic

#### GIS Services

- TiTiler
- PgSTAC
- STAC FastAPI

---

### Deliverables

- Repository hoàn chỉnh
- Docker Compose chạy thành công
- Các service kết nối được

---

# Sprint 1

## Tuần 2

### Mục tiêu

Hiển thị bản đồ cơ bản.

### Công việc

#### Frontend

- Tích hợp MapLibre
- Hiển thị bản đồ
- Zoom
- Pan

#### Layer Management

- OpenStreetMap
- OpenFreeMap

#### Search

- Tìm kiếm vị trí

---

### Deliverables

- WebGIS Viewer

---

### KPI

- Hiển thị bản đồ dưới 2 giây
- Zoom/Pan mượt

---

# Sprint 2

## Tuần 3

### Mục tiêu

Tích hợp STAC.

### Công việc

#### Backend

- STAC Search API
- Collection API

#### Frontend

- Collection Browser
- Search Panel

#### Database

- PgSTAC Integration

---

### Deliverables

- Truy vấn dữ liệu Sentinel-2

---

### KPI

- Search thành công
- Trả kết quả dưới 3 giây

---

# Sprint 3

## Tuần 4

### Mục tiêu

AOI Management.

### Công việc

#### AOI Tools

- Draw Polygon
- Draw Rectangle
- Edit AOI
- Delete AOI

#### Database

- AOI Storage

---

### Deliverables

- AOI Module

---

### KPI

- Lưu AOI thành công
- Hiển thị lại AOI sau khi reload

---

# Sprint 4

## Tuần 5

### Mục tiêu

Measurement Tools.

### Công việc

#### Distance Tool

- Đo khoảng cách

#### Area Tool

- Đo diện tích

#### Perimeter Tool

- Đo chu vi

---

### Deliverables

- Bộ công cụ đo đạc

---

### KPI

- Sai số < 5%

---

# Sprint 5

## Tuần 6

### Mục tiêu

Temporal Comparison.

### Công việc

#### Compare View

- Side-by-Side
- Swipe Comparison

#### APIs

- Compare Endpoint

---

### Deliverables

- Before/After Comparison

---

### KPI

- So sánh ảnh thành công

---

# Sprint 6

## Tuần 7

### Mục tiêu

Async Processing.

### Công việc

#### RabbitMQ

- Queue Setup

#### Celery

- Worker Setup

#### Jobs

- Create Job
- Track Status

---

### Deliverables

- Background Processing

---

### KPI

- Job Queue hoạt động
- API không bị block

---

# Sprint 7

## Tuần 8

### Mục tiêu

Realtime Communication.

### Công việc

#### WebSocket

- Job Progress
- Notifications

#### Frontend

- Progress Monitor

---

### Deliverables

- Realtime Progress Tracking

---

### KPI

- Delay < 1 giây

---

# Sprint 8

## Tuần 9

### Mục tiêu

AI Detection.

### Công việc

#### AI Service

- YOLO Integration

#### Detection

- Vehicle Detection
- Ship Detection
- Aircraft Detection

#### Visualization

- Bounding Boxes

---

### Deliverables

- AI Detection Module

---

### KPI

- Detection thành công
- Kết quả hiển thị trên bản đồ

---

# Sprint 9

## Tuần 10

### Mục tiêu

Kiểm thử và tối ưu.

### Công việc

#### Backend Testing

- Unit Test
- Integration Test

#### Frontend Testing

- Component Test

#### Performance

- Redis Cache
- Query Optimization

#### Documentation

- Hoàn thiện tài liệu

---

### Deliverables

- Phiên bản Release Candidate

---

### KPI

- Không còn lỗi nghiêm trọng

---

# Gantt Chart

```text
Week

Task                     1 2 3 4 5 6 7 8 9 10

Project Setup            ███

Core Mapping               ███

STAC Integration             ███

AOI Tools                      ███

Measurement Tools                ███

Temporal Comparison               ███

Async Processing                    ███

Realtime Tracking                     ███

AI Detection                            ███

Testing & Optimization                    ███
```

---

# MVP Definition

## Bắt buộc

### Mapping

- Hiển thị bản đồ
- Layer Switching

### STAC

- Search Collection
- Search Images

### AOI

- Draw
- Save
- Edit

### Measurement

- Area
- Distance

### Comparison

- Before/After

---

# Production Demo Definition

## Bao gồm MVP

và

### Async Processing

- RabbitMQ
- Celery

### Realtime

- WebSocket

### Redis Cache

- Tile Cache
- Metadata Cache

---

# Stretch Goals

## Nếu còn thời gian

### AI Detection

- Vehicle
- Ship
- Aircraft

### Dashboard

- Statistics
- Analytics

### User Management

- Role-based Access

### Export Data

- GeoJSON
- CSV
- Shapefile

---

# Quản lý rủi ro

## Risk 1

### Mô tả

Khó tích hợp STAC.

### Mức độ

Cao

### Giảm thiểu

- Nghiên cứu STAC từ Sprint 0
- Thử nghiệm với dataset nhỏ

---

## Risk 2

### Mô tả

Hiệu năng Tile Rendering thấp.

### Mức độ

Trung bình

### Giảm thiểu

- Redis Cache
- Tile Cache

---

## Risk 3

### Mô tả

AI Detection không ổn định.

### Mức độ

Trung bình

### Giảm thiểu

- Chuyển thành Optional Feature

---

# Tiêu chí hoàn thành dự án

Dự án được xem là hoàn thành khi:

- Hiển thị bản đồ thành công
- Truy vấn STAC thành công
- AOI hoạt động
- Measurement hoạt động
- Comparison hoạt động
- Async Processing hoạt động
- WebSocket hoạt động

Bonus:

- AI Detection hoạt động

---

# Kết luận

Lộ trình phát triển được xây dựng theo nguyên tắc:

- Hoàn thành chức năng cốt lõi trước
- Luôn có sản phẩm demo sau mỗi Sprint
- Giảm thiểu rủi ro tích hợp
- Dễ theo dõi tiến độ

Sau 10 tuần, hệ thống đạt mức MVP hoàn chỉnh và sẵn sàng trình diễn trong chương trình Viettel Digital Talent.