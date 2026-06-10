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

* [ ] Thiết kế Database Schema
* [ ] Thiết kế API Schema
* [ ] Thiết kế DTO

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

* [ ] AOI Model hoàn chỉnh

---

# Epic 2 - Database Integration

## Task 2.1 - PostGIS Geometry

### Checklist

* [ ] Geometry Column
* [ ] Spatial Index

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

* [ ] Migration Script
* [ ] Upgrade Test
* [ ] Rollback Test

---

## Deliverable

* [ ] AOI Table được tạo thành công

---

# Epic 3 - AOI CRUD APIs

## Task 3.1 - Create AOI

### Checklist

* [ ] API Create AOI

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

* [ ] Tạo AOI thành công

---

## Task 3.2 - Get AOIs

### Checklist

* [ ] Lấy danh sách AOI

---

### Endpoint

```http
GET /api/aois
```

---

## Deliverable

* [ ] Danh sách AOI hiển thị

---

## Task 3.3 - Update AOI

### Checklist

* [ ] Cập nhật tên
* [ ] Cập nhật geometry

---

### Endpoint

```http
PUT /api/aois/{id}
```

---

## Deliverable

* [ ] Chỉnh sửa AOI thành công

---

## Task 3.4 - Delete AOI

### Checklist

* [ ] Soft Delete hoặc Hard Delete

---

### Endpoint

```http
DELETE /api/aois/{id}
```

---

## Deliverable

* [ ] Xóa AOI thành công

---

# Epic 4 - AOI Drawing Tools

## Task 4.1 - Polygon Drawing

### Checklist

* [ ] Draw Polygon
* [ ] Complete Polygon
* [ ] Cancel Drawing

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

* [ ] Draw Polygon hoạt động

---

## Task 4.2 - Rectangle Drawing

### Checklist

* [ ] Draw Rectangle
* [ ] Resize Rectangle

---

## Deliverable

* [ ] Draw Rectangle hoạt động

---

# Epic 5 - AOI Editing

## Task 5.1 - Vertex Editing

### Checklist

* [ ] Kéo thả Vertex
* [ ] Thêm Vertex
* [ ] Xóa Vertex

---

## Deliverable

* [ ] Polygon chỉnh sửa được

---

## Task 5.2 - Move AOI

### Checklist

* [ ] Drag Polygon
* [ ] Update Geometry

---

## Deliverable

* [ ] AOI di chuyển được

---

# Epic 6 - AOI Manager Panel

## Task 6.1 - AOI List

### Checklist

* [ ] Danh sách AOI
* [ ] Tìm kiếm AOI

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

* [ ] Danh sách AOI hiển thị

---

## Task 6.2 - AOI Actions

### Checklist

* [ ] Zoom To AOI
* [ ] Edit AOI
* [ ] Delete AOI

---

## Deliverable

* [ ] AOI Actions hoạt động

---

# Epic 7 - AOI Visualization

## Task 7.1 - Polygon Styling

### Checklist

* [ ] Border Color
* [ ] Fill Color
* [ ] Hover Effect

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

* [ ] AOI hiển thị rõ ràng

---

# Epic 8 - AOI Search Integration

## Task 8.1 - Search By AOI

### Checklist

* [ ] Chuyển Polygon → STAC intersects

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

* [ ] STAC Search theo AOI

---

## Task 8.2 - Search Current AOI

### Checklist

* [ ] Nút Search Current AOI

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

* [ ] Search theo AOI hoạt động

---

# Epic 9 - GeoJSON Support

## Task 9.1 - Export AOI

### Checklist

* [ ] Export GeoJSON

---

### Endpoint

```http
GET /api/aois/{id}/export
```

---

## Deliverable

* [ ] Export GeoJSON

---

## Task 9.2 - Import AOI

### Checklist

* [ ] Upload GeoJSON

---

### Endpoint

```http
POST /api/aois/import
```

---

## Deliverable

* [ ] Import GeoJSON

---

# Epic 10 - Frontend State Management

## Task 10.1 - AOI Store

### Checklist

* [ ] Current AOI
* [ ] AOI List
* [ ] Selected AOI

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

* [ ] State hoạt động

---

# Epic 11 - Testing

## Task 11.1 - CRUD Testing

### Checklist

* [ ] Create
* [ ] Read
* [ ] Update
* [ ] Delete

---

## Task 11.2 - Geometry Validation

### Checklist

* [ ] Polygon hợp lệ
* [ ] Polygon không tự cắt

---

## Task 11.3 - Search Integration

### Checklist

* [ ] AOI → STAC Search

---

## KPI

* [ ] AOI Save < 1s
* [ ] AOI Load < 1s
* [ ] Search By AOI < 3s

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

* [ ] CRUD APIs hoàn chỉnh
* [ ] PostGIS Integration hoàn chỉnh
* [ ] GeoJSON Import/Export hoạt động

## Frontend

* [ ] Draw Polygon
* [ ] Draw Rectangle
* [ ] Edit AOI
* [ ] Delete AOI

## GIS

* [ ] AOI hiển thị trên bản đồ
* [ ] AOI Search hoạt động

## Data

* [ ] AOI lưu được trong PostgreSQL
* [ ] Geometry lưu đúng chuẩn WGS84

## Performance

* [ ] AOI Save dưới 1 giây
* [ ] Search AOI dưới 3 giây

---

# Sprint 3 Success Criteria

Người dùng có thể:

* Vẽ AOI trên bản đồ
* Quản lý AOI
* Lưu AOI
* Xuất/Nhập GeoJSON
* Tìm kiếm ảnh Sentinel-2 theo AOI

Sau Sprint 3, hệ thống đã có khả năng quản lý dữ liệu không gian thực sự và sẵn sàng cho Sprint 4 (Measurement Tools) và Sprint 5 (Temporal Comparison).
