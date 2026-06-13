# Sprint 4 - Measurement Tools & Spatial Analysis

## Thông tin Sprint

**Mục tiêu:** Xây dựng bộ công cụ đo đạc không gian phục vụ phân tích dữ liệu GIS trực tiếp trên bản đồ.

**Thời lượng:** 1 tuần

**Phụ thuộc:**

* Sprint 0 hoàn thành
* Sprint 1 hoàn thành
* Sprint 2 hoàn thành
* Sprint 3 hoàn thành
* AOI Tools hoạt động

---

# Mục tiêu Sprint

Sau Sprint 4, người dùng có thể:

* Đo khoảng cách giữa nhiều điểm
* Đo diện tích Polygon
* Đo chu vi Polygon
* Hiển thị kết quả trực tiếp trên bản đồ
* Xuất kết quả đo đạc

---

# Epic 1 - Measurement Architecture

## Task 1.1 - Thiết kế Measurement Module

### Checklist

* [x] Measurement Service
* [x] Measurement Store
* [x] Measurement Layer

---

## Cấu trúc

```text
frontend/
└── features/
    └── measurement/
        ├── components/
        ├── hooks/
        ├── services/
        └── store/
```

---

## Deliverable

* [x] Measurement Module được khởi tạo

---

# Epic 2 - Distance Tool

## Task 2.1 - Draw Line

### Checklist

* [x] Chọn Distance Tool
* [x] Click nhiều điểm
* [x] Hiển thị Polyline

---

## User Flow

```text
Select Distance Tool

↓

Click Point A

↓

Click Point B

↓

Hiển thị kết quả
```

---

## Deliverable

* [x] Draw Line hoạt động

---

## Task 2.2 - Distance Calculation

### Checklist

* [x] Geodesic Distance
* [x] Hiển thị đơn vị mét
* [x] Hiển thị đơn vị km

---

## Example

```text
Distance

2.34 km
```

---

## Deliverable

* [x] Tính khoảng cách chính xác

---

## Task 2.3 - Multi Segment Distance

### Checklist

* [x] Nhiều điểm
* [x] Tổng chiều dài tuyến

---

## Example

```text
A → B → C → D

Total Distance:
12.6 km
```

---

## Deliverable

* [x] Đo tuyến nhiều đoạn

---

# Epic 3 - Area Tool

## Task 3.1 - Draw Area Polygon

### Checklist

* [x] Draw Polygon
* [x] Complete Polygon

---

## Deliverable

* [x] Polygon đo diện tích hoạt động

---

## Task 3.2 - Area Calculation

### Checklist

* [x] Tính diện tích m²
* [x] Tính diện tích km²
* [x] Tính diện tích ha

---

## Example

```text
Area

1,250,000 m²

125 ha

1.25 km²
```

---

## Deliverable

* [x] Tính diện tích chính xác

---

# Epic 4 - Perimeter Tool

## Task 4.1 - Polygon Perimeter

### Checklist

* [x] Tính chu vi Polygon

---

## Example

```text
Perimeter

4.85 km
```

---

## Deliverable

* [x] Tính chu vi chính xác

---

# Epic 5 - Measurement Visualization

## Task 5.1 - Distance Labels

### Checklist

* [x] Label từng segment
* [x] Label tổng khoảng cách

---

## Example

```text
A ---------- B

1.2 km
```

---

## Deliverable

* [x] Label hiển thị trên bản đồ

---

## Task 5.2 - Area Labels

### Checklist

* [x] Label diện tích
* [x] Label chu vi

---

## Example

```text
Area

125 ha
```

---

## Deliverable

* [x] Label Polygon hiển thị

---

# Epic 6 - Measurement Result Panel

## Task 6.1 - Result Panel

### Checklist

* [x] Measurement Summary
* [x] Measurement History

---

## Wireframe

```text
+----------------------+
| Measurement Result   |
+----------------------+
| Type: Area           |
| Area: 125 ha         |
| Perimeter: 4.8 km    |
+----------------------+
```

---

## Deliverable

* [x] Result Panel hoạt động

---

# Epic 7 - Measurement History

## Task 7.1 - Save Measurement

### Checklist

* [x] Lưu kết quả đo
* [x] Lưu geometry

---

## Example

```json
{
  "type": "area",
  "value": 125,
  "unit": "ha"
}
```

---

## Deliverable

* [x] Measurement History hoạt động

---

## Task 7.2 - Reload Measurement

### Checklist

* [x] Hiển thị lại geometry
* [x] Hiển thị lại kết quả

---

## Deliverable

* [x] History có thể mở lại

---

# Epic 8 - Backend Measurement APIs

## Task 8.1 - Measurement API

### Checklist

* [x] Distance API
* [x] Area API
* [x] Perimeter API

---

## Endpoint

```http
POST /api/measure/distance

POST /api/measure/area

POST /api/measure/perimeter
```

---

## Request

```json
{
  "geometry": {
    "type": "Polygon"
  }
}
```

---

## Response

```json
{
  "area": 125,
  "unit": "ha"
}
```

---

## Deliverable

* [x] Measurement APIs hoạt động

---

# Epic 9 - PostGIS Spatial Functions

## Task 9.1 - Distance Functions

### Checklist

* [x] ST_Distance()
* [x] ST_Length()

---

## Example

```sql
SELECT ST_Length(
    geography(geometry)
);
```

---

## Deliverable

* [x] Tính khoảng cách bằng PostGIS

---

## Task 9.2 - Area Functions

### Checklist

* [x] ST_Area()

---

## Example

```sql
SELECT ST_Area(
    geography(geometry)
);
```

---

## Deliverable

* [x] Tính diện tích bằng PostGIS

---

# Epic 10 - Export Measurement

## Task 10.1 - Export GeoJSON

### Checklist

* [x] Export Geometry
* [x] Export Metadata

---

## Example

```json
{
  "type": "Feature",
  "properties": {
    "area": 125
  }
}
```

---

## Deliverable

* [x] Export GeoJSON hoạt động

---

## Task 10.2 - Export CSV

### Checklist

* [x] CSV Export

---

## Example

```csv
Type,Value,Unit
Area,125,ha
```

---

## Deliverable

* [x] Export CSV hoạt động

---

# Epic 11 - Frontend State Management

## Task 11.1 - Measurement Store

### Checklist

* [x] Current Measurement
* [x] Measurement History

---

## Example

```ts
interface MeasurementState {
  currentMeasurement?: Measurement;
  history: Measurement[];
}
```

---

## Deliverable

* [x] State hoạt động

---

# Epic 12 - Testing

## Task 12.1 - Distance Testing

### Checklist

* [x] Khoảng cách ngắn
* [x] Khoảng cách dài

---

## Task 12.2 - Area Testing

### Checklist

* [x] Polygon nhỏ
* [x] Polygon lớn

---

## Task 12.3 - Precision Validation

### Checklist

* [x] Sai số < 2%

---

## KPI

* [x] Measurement < 1s
* [x] Render < 500ms

---

# Sprint 4 Demo Scenario

## Demo Flow

### Bước 1

Mở ứng dụng

---

### Bước 2

Chọn:

```text
Distance Tool
```

---

### Bước 3

Click:

```text
Noi Bai Airport

↓

My Dinh Stadium
```

---

### Bước 4

Hiển thị:

```text
Distance

25.3 km
```

---

### Bước 5

Chọn:

```text
Area Tool
```

---

### Bước 6

Vẽ Polygon quanh:

```text
Noi Bai Airport
```

---

### Bước 7

Hiển thị:

```text
Area

1,245 ha

Perimeter

18.5 km
```

---

### Bước 8

Export GeoJSON

---

# Sprint 4 Definition Of Done

## Distance Tool

* [x] Draw Line
* [x] Multi Segment
* [x] Distance Label

## Area Tool

* [x] Draw Polygon
* [x] Area Calculation

## Perimeter Tool

* [x] Perimeter Calculation

## Backend

* [x] Measurement APIs
* [x] PostGIS Functions

## Data

* [x] Export GeoJSON
* [x] Export CSV

## Performance

* [x] Tính toán dưới 1 giây
* [x] Sai số dưới 2%

---

# Sprint 4 Success Criteria

Người dùng có thể:

* Đo khoảng cách
* Đo diện tích
* Đo chu vi
* Xuất kết quả đo đạc

Sau Sprint 4, hệ thống đã cung cấp đầy đủ các công cụ đo đạc cơ bản của một nền tảng WebGIS chuyên nghiệp và sẵn sàng cho Sprint 5 (Temporal Comparison) — tính năng phân tích thay đổi ảnh vệ tinh theo thời gian, một trong những chức năng quan trọng nhất của đề tài.
