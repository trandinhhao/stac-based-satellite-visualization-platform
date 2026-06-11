# Sprint 3 - AOI Tools & Spatial Data Management

## Thông tin Sprint

**Mục tiêu:** Xây dựng hệ thống quản lý AOI (Area Of Interest) cho phép người dùng tạo, chỉnh sửa, lưu trữ và sử dụng AOI trong các truy vấn STAC.

**Thời lượng:** 1 tuần

**Phụ thuộc:**

* Sprint 0 hoàn thành
* Sprint 1 hoàn thành
* Sprint 2 hoàn thành
* STAC Search hoạt động

---

# Mục tiêu Sprint

Sau Sprint 3, người dùng có thể:

* Vẽ Polygon AOI
* Vẽ Rectangle AOI
* Chỉnh sửa AOI
* Xóa AOI
* Lưu AOI
* Tải lại AOI đã lưu
* Zoom tới AOI
* Dùng AOI để tìm kiếm ảnh Sentinel-2

---

# Epic 1 - AOI Data Model

## Task 1.1 - Thiết kế AOI Entity

### Checklist

* [x] Thiết kế Database Schema
* [x] Thiết kế API Schema
* [x] Thiết kế DTO

---

## Database Model

```sql
CREATE TABLE aois (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    geometry GEOMETRY(POLYGON,4326),
    area DOUBLE PRECISION,
    perimeter DOUBLE PRECISION,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

---

## AOI Object

```json
{
  "id": "uuid",
  "name": "Noi Bai Airport",
  "description": "Airport Monitoring Area",
  "geometry": {
    "type": "Polygon",
    "coordinates": []
  }
}
```

---

## Deliverable

* [x] AOI Model hoàn chỉnh

---

# Epic 2 - Database Integration

## Task 2.1 - PostGIS Geometry

### Checklist

* [x] Geometry Column
* [x] Spatial Index

---

## Spatial Index

```sql
CREATE INDEX idx_aois_geometry
ON aois
USING GIST (geometry);
```

---

## Task 2.2 - Alembic Migration

### Checklist

* [x] Migration Script
* [x] Upgrade Test
* [x] Rollback Test

---

## Deliverable

* [x] AOI Table được tạo thành công

---

# Epic 3 - AOI CRUD APIs

## Task 3.1 - Create AOI

### Checklist

* [x] API Create AOI

---

### Endpoint

```http
POST /api/aois
```

---

### Request

```json
{
  "name": "Noi Bai Airport",
  "description": "Airport Area",
  "geometry": {}
}
```

---

### Response

```json
{
  "id": "uuid"
}
```

---

## Deliverable

* [x] Tạo AOI thành công

---

## Task 3.2 - Get AOIs

### Checklist

* [x] Lấy danh sách AOI

---

### Endpoint

```http
GET /api/aois
```

---

## Deliverable

* [x] Danh sách AOI hiển thị

---

## Task 3.3 - Update AOI

### Checklist

* [x] Cập nhật tên
* [x] Cập nhật geometry

---

### Endpoint

```http
PUT /api/aois/{id}
```

---

## Deliverable

* [x] Chỉnh sửa AOI thành công

---

## Task 3.4 - Delete AOI

### Checklist

* [x] Soft Delete hoặc Hard Delete

---

### Endpoint

```http
DELETE /api/aois/{id}
```

---

## Deliverable

* [x] Xóa AOI thành công

---

# Epic 4 - AOI Drawing Tools

## Task 4.1 - Polygon Drawing

### Checklist

* [x] Draw Polygon
* [x] Complete Polygon
* [x] Cancel Drawing

---

## User Flow

```text
Click Draw Polygon

↓

Click các điểm trên bản đồ

↓

Double Click

↓

Polygon được tạo
```

---

## Deliverable

* [x] Draw Polygon hoạt động

---

## Task 4.2 - Rectangle Drawing

### Checklist

* [x] Draw Rectangle
* [x] Resize Rectangle

---

## Deliverable

* [x] Draw Rectangle hoạt động

---

# Epic 5 - AOI Editing

## Task 5.1 - Vertex Editing

### Checklist

* [x] Kéo thả Vertex
* [x] Thêm Vertex
* [x] Xóa Vertex

---

## Deliverable

* [x] Polygon chỉnh sửa được

---

## Task 5.2 - Move AOI

### Checklist

* [x] Drag Polygon
* [x] Update Geometry

---

## Deliverable

* [x] AOI di chuyển được

---

# Epic 6 - AOI Manager Panel

## Task 6.1 - AOI List

### Checklist

* [x] Danh sách AOI
* [x] Tìm kiếm AOI

---

## Wireframe

```text
+----------------------+
| AOI Manager          |
+----------------------+
| Noi Bai Airport      |
| Hanoi Urban Area     |
| Hai Phong Port       |
+----------------------+
```

---

## Deliverable

* [x] Danh sách AOI hiển thị

---

## Task 6.2 - AOI Actions

### Checklist

* [x] Zoom To AOI
* [x] Edit AOI
* [x] Delete AOI

---

## Deliverable

* [x] AOI Actions hoạt động

---

# Epic 7 - AOI Visualization

## Task 7.1 - Polygon Styling

### Checklist

* [x] Border Color
* [x] Fill Color
* [x] Hover Effect

---

## Example

```text
Border:
Blue

Fill:
Transparent Blue
```

---

## Deliverable

* [x] AOI hiển thị rõ ràng

---

# Epic 8 - AOI Search Integration

## Task 8.1 - Search By AOI

### Checklist

* [x] Chuyển Polygon → STAC intersects

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

* [x] STAC Search theo AOI

---

## Task 8.2 - Search Current AOI

### Checklist

* [x] Nút Search Current AOI

---

## Flow

```text
Chọn AOI

↓

Search Images

↓

STAC Search

↓

Kết quả ảnh
```

---

## Deliverable

* [x] Search theo AOI hoạt động

---

# Epic 9 - GeoJSON Support

## Task 9.1 - Export AOI

### Checklist

* [x] Export GeoJSON

---

### Endpoint

```http
GET /api/aois/{id}/export
```

---

## Deliverable

* [x] Export GeoJSON

---

## Task 9.2 - Import AOI

### Checklist

* [x] Upload GeoJSON

---

### Endpoint

```http
POST /api/aois/import
```

---

## Deliverable

* [x] Import GeoJSON

---

# Epic 10 - Frontend State Management

## Task 10.1 - AOI Store

### Checklist

* [x] Current AOI
* [x] AOI List
* [x] Selected AOI

---

## Example

```ts
interface AOIState {
  aois: AOI[];
  selectedAOI?: AOI;
}
```

---

## Deliverable

* [x] State hoạt động

---

# Epic 11 - Testing

## Task 11.1 - CRUD Testing

### Checklist

* [x] Create
* [x] Read
* [x] Update
* [x] Delete

---

## Task 11.2 - Geometry Validation

### Checklist

* [x] Polygon hợp lệ
* [x] Polygon không tự cắt

---

## Task 11.3 - Search Integration

### Checklist

* [x] AOI → STAC Search

---

## KPI

* [x] AOI Save < 1s
* [x] AOI Load < 1s
* [x] Search By AOI < 3s

---

# Sprint 3 Demo Scenario

## Demo Flow

### Bước 1

Mở ứng dụng

---

### Bước 2

Chọn:

```text
Draw Polygon
```

---

### Bước 3

Vẽ AOI quanh:

```text
Noi Bai Airport
```

---

### Bước 4

Lưu AOI

```text
Name:
Noi Bai Airport
```

---

### Bước 5

AOI xuất hiện trong AOI Manager

---

### Bước 6

Chọn:

```text
Search Images
```

---

### Bước 7

STAC Search sử dụng Polygon

---

### Bước 8

Danh sách ảnh Sentinel-2 xuất hiện

---

### Bước 9

Export AOI thành GeoJSON

---

# Sprint 3 Definition Of Done

## Backend

* [x] CRUD APIs hoàn chỉnh
* [x] PostGIS Integration hoàn chỉnh
* [x] GeoJSON Import/Export hoạt động

## Frontend

* [x] Draw Polygon
* [x] Draw Rectangle
* [x] Edit AOI
* [x] Delete AOI

## GIS

* [x] AOI hiển thị trên bản đồ
* [x] AOI Search hoạt động

## Data

* [x] AOI lưu được trong PostgreSQL
* [x] Geometry lưu đúng chuẩn WGS84

## Performance

* [x] AOI Save dưới 1 giây
* [x] Search AOI dưới 3 giây

---

# Sprint 3 Success Criteria

Người dùng có thể:

* Vẽ AOI trên bản đồ
---

### Endpoint

```http
POST /api/aois/import
```

---

## Deliverable

* [x] Import GeoJSON

---

# Epic 10 - Frontend State Management

## Task 10.1 - AOI Store

### Checklist

* [x] Current AOI
* [x] AOI List
* [x] Selected AOI

---

## Example

```ts
interface AOIState {
  aois: AOI[];
  selectedAOI?: AOI;
}
```

---

## Deliverable

* [x] State hoạt động

---

# Epic 11 - Testing

## Task 11.1 - CRUD Testing

### Checklist

* [x] Create
* [x] Read
* [x] Update
* [x] Delete

---

## Task 11.2 - Geometry Validation

### Checklist

* [x] Polygon hợp lệ
* [x] Polygon không tự cắt

---

## Task 11.3 - Search Integration

### Checklist

* [x] AOI → STAC Search

---

## KPI

* [x] AOI Save < 1s
* [x] AOI Load < 1s
* [x] Search By AOI < 3s

---

# Sprint 3 Demo Scenario

## Demo Flow

### Bước 1

Mở ứng dụng

---

### Bước 2

Chọn:

```text
Draw Polygon
```

---

### Bước 3

Vẽ AOI quanh:

```text
Noi Bai Airport
```

---

### Bước 4

Lưu AOI

```text
Name:
Noi Bai Airport
```

---

### Bước 5

AOI xuất hiện trong AOI Manager

---

### Bước 6

Chọn:

```text
Search Images
```

---

### Bước 7

STAC Search sử dụng Polygon

---

### Bước 8

Danh sách ảnh Sentinel-2 xuất hiện

---

### Bước 9

Export AOI thành GeoJSON

---

# Sprint 3 Definition Of Done

## Backend

* [x] CRUD APIs hoàn chỉnh
* [x] PostGIS Integration hoàn chỉnh
* [x] GeoJSON Import/Export hoạt động

## Frontend

* [x] Draw Polygon
* [x] Draw Rectangle
* [x] Edit AOI
* [x] Delete AOI

## GIS

* [x] AOI hiển thị trên bản đồ
* [x] AOI Search hoạt động

## Data

* [x] AOI lưu được trong PostgreSQL
* [x] Geometry lưu đúng chuẩn WGS84

## Performance

* [x] AOI Save dưới 1 giây
* [x] Search AOI dưới 3 giây

---

# Sprint 3 Success Criteria

Người dùng có thể:

* Vẽ AOI trên bản đồ
* Quản lý AOI
* Lưu AOI
* Xuất/Nhập GeoJSON
* Tìm kiếm ảnh Sentinel-2 theo AOI

Sau Sprint 3, hệ thống đã có khả năng quản lý dữ liệu không gian thực sự và sẵn sàng cho Sprint 4 (Measurement Tools) và Sprint 5 (Temporal Comparison).
