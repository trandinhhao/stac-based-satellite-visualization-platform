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

* [ ] Hiểu Catalog
* [ ] Hiểu Collection
* [ ] Hiểu Item
* [ ] Hiểu Asset

---

## Task 1.2 - Hiểu Sentinel-2 Dataset

### Checklist

* [ ] Tile Structure
* [ ] Acquisition Date
* [ ] Cloud Cover
* [ ] Spectral Bands

---

## Deliverable

* [ ] Team hiểu mô hình dữ liệu STAC

---

# Epic 2 - Backend STAC Service

## Task 2.1 - Tạo STAC Service Layer

### Checklist

* [ ] STAC Client
* [ ] Search Function
* [ ] Collection Function

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

* [ ] Backend gọi được STAC API

---

# Epic 3 - Collections API

## Task 3.1 - Get Collections

### Checklist

* [ ] API lấy danh sách Collection

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

* [ ] Trả danh sách Collection thành công

---

# Epic 4 - Search Satellite Images

## Task 4.1 - Search Endpoint

### Checklist

* [ ] Search theo thời gian
* [ ] Search theo BBOX

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

* [ ] Validate Date
* [ ] Validate BBOX

---

## Deliverable

* [ ] Search trả dữ liệu đúng

---

# Epic 5 - Frontend STAC Search Panel

## Task 5.1 - Search UI

### Checklist

* [ ] Collection Dropdown
* [ ] Start Date
* [ ] End Date
* [ ] Search Button

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

* [ ] Search Panel hoạt động

---

# Epic 6 - Search Results

## Task 6.1 - Result List

### Checklist

* [ ] Danh sách ảnh
* [ ] Ngày chụp
* [ ] Cloud Cover

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

* [ ] Load More
* [ ] Infinite Scroll (Optional)

---

## Deliverable

* [ ] Hiển thị kết quả tìm kiếm

---

# Epic 7 - Metadata Viewer

## Task 7.1 - Metadata Drawer

### Checklist

* [ ] ID
* [ ] Datetime
* [ ] Collection
* [ ] Assets

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

* [ ] Metadata hiển thị đầy đủ

---

# Epic 8 - Satellite Layer Rendering

## Task 8.1 - TiTiler Integration

### Checklist

* [ ] Kết nối TiTiler
* [ ] Tạo Tile URL

---

## Example

```http
/titiler/cog/tiles/{z}/{x}/{y}
```

---

## Task 8.2 - Add Raster Layer

### Checklist

* [ ] Overlay Satellite Layer
* [ ] Remove Layer

---

## Deliverable

* [ ] Ảnh vệ tinh hiển thị trên bản đồ

---

# Epic 9 - Preview Image

## Task 9.1 - Thumbnail Preview

### Checklist

* [ ] Thumbnail Viewer
* [ ] Open Preview

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

* [ ] Xem preview ảnh

---

# Epic 10 - Search By Viewport

## Task 10.1 - Current View Search

### Checklist

* [ ] Lấy Bounding Box hiện tại
* [ ] Search theo Viewport

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

* [ ] Search theo viewport

---

# Epic 11 - Search By AOI (Chuẩn bị cho Sprint 3)

## Task 11.1

### Checklist

* [ ] Cho phép truyền Polygon

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

* [ ] Hỗ trợ Search theo Polygon

---

# Epic 12 - State Management

## Task 12.1 - STAC Store

### Checklist

* [ ] Collections
* [ ] Search Result
* [ ] Selected Item

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

* [ ] State hoạt động

---

# Epic 13 - Backend Caching

## Task 13.1 - Cache Collections

### Checklist

* [ ] Redis Cache

TTL:

```text
1 hour
```

---

## Task 13.2 - Cache Search

### Checklist

* [ ] Cache phổ biến query

---

## Deliverable

* [ ] Redis cache hoạt động

---

# Epic 14 - Testing

## Task 14.1 - API Testing

### Checklist

* [ ] Collections API
* [ ] Search API

---

## Task 14.2 - Frontend Testing

### Checklist

* [ ] Search Flow
* [ ] Render Flow

---

## KPI

* [ ] Search < 3s
* [ ] Collection Load < 1s

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

* [ ] Collections API hoạt động
* [ ] Search API hoạt động

## Frontend

* [ ] Search Panel hoàn chỉnh
* [ ] Result List hoàn chỉnh
* [ ] Metadata Viewer hoàn chỉnh

## STAC

* [ ] Query Collection thành công
* [ ] Query Sentinel-2 thành công

## Rendering

* [ ] Hiển thị ảnh vệ tinh
* [ ] Hiển thị thumbnail

## Performance

* [ ] Search dưới 3 giây
* [ ] Collection Load dưới 1 giây

---

# Sprint 2 Success Criteria

Người dùng có thể:

* Chọn Collection
* Tìm kiếm ảnh Sentinel-2
* Xem metadata
* Hiển thị ảnh lên bản đồ

Sau Sprint 2, hệ thống đã trở thành một nền tảng khai thác dữ liệu ảnh vệ tinh thực sự thay vì chỉ là WebGIS Viewer. Đây cũng là nền tảng cho Sprint 3 (AOI Management) và Sprint 4 (Measurement Tools).
