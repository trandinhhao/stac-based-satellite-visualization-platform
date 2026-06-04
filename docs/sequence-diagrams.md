# sequence-diagrams.md

# Sequence Diagrams

## 1. Giới thiệu

Tài liệu này mô tả luồng tương tác giữa các thành phần trong hệ thống:

- Frontend (React)
- Backend (FastAPI)
- STAC FastAPI
- PgSTAC
- TiTiler
- Redis
- RabbitMQ
- Celery Worker
- AI Service

Các sơ đồ được sử dụng để:

- Hiểu luồng xử lý
- Thiết kế API
- Thiết kế Service
- Hỗ trợ triển khai

---

# SD01 - Hiển thị bản đồ

## Mục tiêu

Hiển thị bản đồ nền và ảnh vệ tinh.

```mermaid
sequenceDiagram

actor User

participant FE as React Frontend
participant Tile as TiTiler
participant Redis
participant PgSTAC

User->>FE: Mở bản đồ

FE->>Tile: Request Tile

Tile->>Redis: Check Cache

alt Cache Hit

Redis-->>Tile: Tile

else Cache Miss

Tile->>PgSTAC: Query Metadata

PgSTAC-->>Tile: Metadata

Tile->>Tile: Generate Tile

Tile->>Redis: Save Cache

end

Tile-->>FE: Tile

FE-->>User: Render Map
```

---

# SD02 - Tìm kiếm vị trí

## Mục tiêu

Tìm kiếm theo tên địa danh.

```mermaid
sequenceDiagram

actor User

participant FE
participant API
participant GeoService

User->>FE: Nhập từ khóa

FE->>API: Search Location

API->>GeoService: Geocoding Request

GeoService-->>API: Results

API-->>FE: Location List

FE-->>User: Hiển thị kết quả
```

---

# SD03 - Truy vấn dữ liệu STAC

## Mục tiêu

Tìm kiếm ảnh vệ tinh.

```mermaid
sequenceDiagram

actor User

participant FE
participant API
participant STAC
participant PgSTAC

User->>FE: Chọn Collection

User->>FE: Chọn Time Range

User->>FE: Chọn AOI

FE->>API: Search Request

API->>STAC: STAC Search

STAC->>PgSTAC: Query Items

PgSTAC-->>STAC: Results

STAC-->>API: STAC Response

API-->>FE: Search Results

FE-->>User: Hiển thị danh sách ảnh
```

---

# SD04 - Tạo AOI

## Mục tiêu

Lưu vùng quan tâm.

```mermaid
sequenceDiagram

actor User

participant FE
participant API
participant DB

User->>FE: Vẽ Polygon

FE->>FE: Sinh GeoJSON

User->>FE: Nhập tên AOI

FE->>API: Create AOI

API->>DB: Insert AOI

DB-->>API: Success

API-->>FE: AOI Created

FE-->>User: Hiển thị AOI
```

---

# SD05 - Chỉnh sửa AOI

## Mục tiêu

Cập nhật AOI.

```mermaid
sequenceDiagram

actor User

participant FE
participant API
participant DB

User->>FE: Chọn AOI

User->>FE: Edit Geometry

FE->>API: Update AOI

API->>DB: Update AOI

DB-->>API: Success

API-->>FE: Updated

FE-->>User: Refresh Map
```

---

# SD06 - Xóa AOI

## Mục tiêu

Xóa AOI.

```mermaid
sequenceDiagram

actor User

participant FE
participant API
participant DB

User->>FE: Delete AOI

FE->>API: Delete Request

API->>DB: Delete AOI

DB-->>API: Success

API-->>FE: Deleted

FE-->>User: AOI Removed
```

---

# SD07 - Đo diện tích

## Mục tiêu

Tính diện tích AOI.

```mermaid
sequenceDiagram

actor User

participant FE
participant TurfJS

User->>FE: Draw Polygon

FE->>TurfJS: Calculate Area

TurfJS-->>FE: Area Result

FE-->>User: Display Area
```

---

# SD08 - Đo khoảng cách

## Mục tiêu

Tính khoảng cách.

```mermaid
sequenceDiagram

actor User

participant FE
participant TurfJS

User->>FE: Select Points

FE->>TurfJS: Calculate Distance

TurfJS-->>FE: Distance

FE-->>User: Show Distance
```

---

# SD09 - So sánh ảnh theo thời gian

## Mục tiêu

Hiển thị Before/After.

```mermaid
sequenceDiagram

actor User

participant FE
participant API
participant STAC

User->>FE: Chọn Date A

User->>FE: Chọn Date B

FE->>API: Compare Request

API->>STAC: Query Images

STAC-->>API: Image A

STAC-->>API: Image B

API-->>FE: Compare Data

FE-->>User: Compare View
```

---

# SD10 - Tạo Job Detection

## Mục tiêu

Khởi tạo Detection Job.

```mermaid
sequenceDiagram

actor User

participant FE
participant API
participant DB
participant MQ

User->>FE: Detect Objects

FE->>API: Create Job

API->>DB: Save Job

DB-->>API: Job ID

API->>MQ: Publish Message

MQ-->>API: Ack

API-->>FE: Job Created

FE-->>User: Pending Status
```

---

# SD11 - Worker xử lý Detection

## Mục tiêu

Thực hiện AI Inference.

```mermaid
sequenceDiagram

participant MQ
participant Worker
participant AI
participant DB

MQ->>Worker: Consume Job

Worker->>DB: Update Running

Worker->>AI: Run Detection

AI-->>Worker: Results

Worker->>DB: Save Results

Worker->>DB: Update Completed
```

---

# SD12 - Theo dõi tiến trình Job

## Mục tiêu

Realtime Progress.

```mermaid
sequenceDiagram

actor User

participant FE
participant WS
participant Worker

User->>FE: Open Job Monitor

FE->>WS: Connect

Worker->>WS: Progress 10%

WS-->>FE: Progress Event

Worker->>WS: Progress 50%

WS-->>FE: Progress Event

Worker->>WS: Progress 100%

WS-->>FE: Job Completed

FE-->>User: Update Progress Bar
```

---

# SD13 - Xem kết quả Detection

## Mục tiêu

Hiển thị kết quả nhận dạng.

```mermaid
sequenceDiagram

actor User

participant FE
participant API
participant DB

User->>FE: Open Detection

FE->>API: Get Results

API->>DB: Query Results

DB-->>API: Detection Data

API-->>FE: Results

FE-->>User: Render Bounding Boxes
```

---

# SD14 - Luồng Cache Tile

## Mục tiêu

Tối ưu truy vấn Tile.

```mermaid
sequenceDiagram

participant FE
participant TiTiler
participant Redis
participant PgSTAC

FE->>TiTiler: Request Tile

TiTiler->>Redis: Check Cache

alt Cache Hit

Redis-->>TiTiler: Tile

else Cache Miss

TiTiler->>PgSTAC: Query Metadata

PgSTAC-->>TiTiler: Metadata

TiTiler->>TiTiler: Generate Tile

TiTiler->>Redis: Save Cache

end

TiTiler-->>FE: Tile
```

---

# SD15 - Luồng toàn hệ thống

## End-to-End Flow

```mermaid
sequenceDiagram

actor User

participant FE
participant API
participant STAC
participant PgSTAC
participant MQ
participant Worker
participant AI
participant Redis
participant WS

User->>FE: Search Image

FE->>API: Search

API->>STAC: Query

STAC->>PgSTAC: Search

PgSTAC-->>STAC: Results

STAC-->>API: Metadata

API-->>FE: Images

User->>FE: Detect Objects

FE->>API: Create Job

API->>MQ: Publish

MQ->>Worker: Consume

Worker->>AI: Detection

AI-->>Worker: Result

Worker->>Redis: Save Progress

Worker->>WS: Progress Event

WS-->>FE: Update Progress

Worker->>API: Save Result

API-->>FE: Detection Result

FE-->>User: Render Objects
```

---

# Tổng kết

Tài liệu hiện bao gồm 15 Sequence Diagram:

| ID | Sequence Diagram |
|------|-------------------|
| SD01 | Hiển thị bản đồ |
| SD02 | Tìm kiếm vị trí |
| SD03 | STAC Search |
| SD04 | Tạo AOI |
| SD05 | Chỉnh sửa AOI |
| SD06 | Xóa AOI |
| SD07 | Đo diện tích |
| SD08 | Đo khoảng cách |
| SD09 | So sánh ảnh |
| SD10 | Tạo Detection Job |
| SD11 | Worker Detection |
| SD12 | Theo dõi Job |
| SD13 | Xem Detection |
| SD14 | Tile Cache |
| SD15 | End-to-End Flow |

Các sơ đồ này phản ánh đầy đủ luồng hoạt động của hệ thống từ frontend tới backend, STAC services, queue processing và AI inference.