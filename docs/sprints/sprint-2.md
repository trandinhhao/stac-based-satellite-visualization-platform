# Sprint 2 - STAC Integration & Satellite Data Search

## Thông tin Sprint

**Mục tiêu:** Tích hợp chuẩn STAC và dữ liệu ảnh vệ tinh thực tế vào hệ thống.

**Thời lượng:** 1 tuần

**Phụ thuộc:**

* Sprint 0 hoàn thành
* Sprint 1 hoàn thành
* PgSTAC hoạt động
* stac-fastapi hoạt động
* TiTiler hoạt động

---

# Mục tiêu Sprint

Sau Sprint 2, người dùng có thể:

* Xem danh sách Collection
* Tìm kiếm ảnh Sentinel-2
* Lọc theo thời gian
* Lọc theo khu vực
* Xem metadata ảnh
* Hiển thị ảnh vệ tinh lên bản đồ
* Xem preview ảnh

---

# Epic 1 - Nghiên cứu STAC

## Task 1.1 - Hiểu STAC Specification

### Checklist

* [x] Hiểu Catalog
* [x] Hiểu Collection
* [x] Hiểu Item
* [x] Hiểu Asset

---

## Task 1.2 - Hiểu Sentinel-2 Dataset

### Checklist

* [x] Tile Structure
* [x] Acquisition Date
* [x] Cloud Cover
* [x] Spectral Bands

---

## Deliverable

* [x] Team hiểu mô hình dữ liệu STAC

---

# Epic 2 - Backend STAC Service

## Task 2.1 - Tạo STAC Service Layer

### Checklist

* [x] STAC Client
* [x] Search Function
* [x] Collection Function

---

## Folder

```text
app/
└── services/
    └── stac/
        ├── client.py
        ├── search.py
        └── collections.py
```

---

## Deliverable

* [x] Backend gọi được STAC API

---

# Epic 3 - Collections API

## Task 3.1 - Get Collections

### Checklist

* [x] API lấy danh sách Collection

---

### Endpoint

```http
GET /api/stac/collections
```

---

### Response

```json
[
  {
    "id": "sentinel-2-l2a",
    "title": "Sentinel-2 L2A"
  }
]
```

---

## Deliverable

* [x] Trả danh sách Collection thành công

---

# Epic 4 - Search Satellite Images

## Task 4.1 - Search Endpoint

### Checklist

* [x] Search theo thời gian
* [x] Search theo BBOX

---

### Endpoint

```http
POST /api/stac/search
```

---

### Request

```json
{
  "collections": [
    "sentinel-2-l2a"
  ],
  "datetime": "2025-01-01/2025-12-31",
  "bbox": [
    105.7,
    20.9,
    106.0,
    21.2
  ]
}
```

---

## Task 4.2 - Validate Search Input

### Checklist

* [x] Validate Date
* [x] Validate BBOX

---

## Deliverable

* [x] Search trả dữ liệu đúng

---

# Epic 5 - Frontend STAC Search Panel

## Task 5.1 - Search UI

### Checklist

* [x] Collection Dropdown
* [x] Start Date
* [x] End Date
* [x] Search Button

---

## Wireframe

```text
+--------------------------+
| STAC Search              |
+--------------------------+
| Collection               |
| [ Sentinel-2 ▼ ]         |
|                          |
| Start Date               |
| [2025-01-01]             |
|                          |
| End Date                 |
| [2025-12-31]             |
|                          |
| [ Search ]               |
+--------------------------+
```

---

## Deliverable

* [x] Search Panel hoạt động

---

# Epic 6 - Search Results

## Task 6.1 - Result List

### Checklist

* [x] Danh sách ảnh
* [x] Ngày chụp
* [x] Cloud Cover

---

## Example

```text
Sentinel-2

Date:
2025-03-15

Cloud:
8%
```

---

## Task 6.2 - Pagination

### Checklist

* [x] Load More
* [x] Infinite Scroll (Optional)

---

## Deliverable

* [x] Hiển thị kết quả tìm kiếm

---

# Epic 7 - Metadata Viewer

## Task 7.1 - Metadata Drawer

### Checklist

* [x] ID
* [x] Datetime
* [x] Collection
* [x] Assets

---

## Example

```text
Item ID:
S2A_20250315

Datetime:
2025-03-15T03:22:00Z

Cloud Cover:
8%
```

---

## Deliverable

* [x] Metadata hiển thị đầy đủ

---

# Epic 8 - Satellite Layer Rendering

## Task 8.1 - TiTiler Integration

### Checklist

* [x] Kết nối TiTiler
* [x] Tạo Tile URL

---

## Example

```http
/titiler/cog/tiles/{z}/{x}/{y}
```

---

## Task 8.2 - Add Raster Layer

### Checklist

* [x] Overlay Satellite Layer
* [x] Remove Layer

---

## Deliverable

* [x] Ảnh vệ tinh hiển thị trên bản đồ

---

# Epic 9 - Preview Image

## Task 9.1 - Thumbnail Preview

### Checklist

* [x] Thumbnail Viewer
* [x] Open Preview

---

## Wireframe

```text
+----------------------+
| Thumbnail            |
|                      |
|     IMAGE            |
|                      |
+----------------------+
```

---

## Deliverable

* [x] Xem preview ảnh

---

# Epic 10 - Search By Viewport

## Task 10.1 - Current View Search

### Checklist

* [x] Lấy Bounding Box hiện tại
* [x] Search theo Viewport

---

## Flow

```text
Zoom tới Hà Nội

↓

Search

↓

Chỉ lấy ảnh trong viewport hiện tại
```

---

## Deliverable

* [x] Search theo viewport

---

# Epic 11 - Search By AOI (Chuẩn bị cho Sprint 3)

## Task 11.1

### Checklist

* [x] Cho phép truyền Polygon

---

### Request

```json
{
  "intersects": {
    "type": "Polygon"
  }
}
```

---

## Deliverable

* [x] Hỗ trợ Search theo Polygon

---

# Epic 12 - State Management

## Task 12.1 - STAC Store

### Checklist

* [x] Collections
* [x] Search Result
* [x] Selected Item

---

## Example

```ts
interface StacState {
  collections: Collection[];
  results: Item[];
  selectedItem?: Item;
}
```

---

## Deliverable

* [x] State hoạt động

---

# Epic 13 - Backend Caching

## Task 13.1 - Cache Collections

### Checklist

* [x] Redis Cache

TTL:

```text
1 hour
```

---

## Task 13.2 - Cache Search

### Checklist

* [x] Cache phổ biến query

---

## Deliverable

* [x] Redis cache hoạt động

---

# Epic 14 - Testing

## Task 14.1 - API Testing

### Checklist

* [x] Collections API
* [x] Search API

---

## Task 14.2 - Frontend Testing

### Checklist

* [x] Search Flow
* [x] Render Flow

---

## KPI

* [x] Search < 3s
* [x] Collection Load < 1s

---

# Sprint 2 Demo Scenario

## Demo Flow

### Bước 1

Mở ứng dụng

---

### Bước 2

Mở STAC Search Panel

---

### Bước 3

Chọn:

```text
Sentinel-2
```

---

### Bước 4

Nhập:

```text
01/01/2025
↓

31/12/2025
```

---

### Bước 5

Search

---

### Bước 6

Danh sách ảnh xuất hiện

---

### Bước 7

Click một ảnh

---

### Bước 8

Metadata hiển thị

---

### Bước 9

Ảnh hiển thị trên bản đồ

---

# Sprint 2 Definition Of Done

## Backend

* [x] Collections API hoạt động
* [x] Search API hoạt động

## Frontend

* [x] Search Panel hoàn chỉnh
* [x] Result List hoàn chỉnh
* [x] Metadata Viewer hoàn chỉnh

## STAC

* [x] Query Collection thành công
* [x] Query Sentinel-2 thành công

## Rendering

* [x] Hiển thị ảnh vệ tinh
* [x] Hiển thị thumbnail

## Performance

* [x] Search dưới 3 giây
* [x] Collection Load dưới 1 giây

---

# Sprint 2 Success Criteria

Người dùng có thể:

* Chọn Collection
* Tìm kiếm ảnh Sentinel-2
* Xem metadata
* Hiển thị ảnh lên bản đồ

Sau Sprint 2, hệ thống đã trở thành một nền tảng khai thác dữ liệu ảnh vệ tinh thực sự thay vì chỉ là WebGIS Viewer. Đây cũng là nền tảng cho Sprint 3 (AOI Management) và Sprint 4 (Measurement Tools).
