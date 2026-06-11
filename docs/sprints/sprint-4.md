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

* [ ] Measurement Service
* [ ] Measurement Store
* [ ] Measurement Layer

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

* [ ] Measurement Module được khởi tạo

---

# Epic 2 - Distance Tool

## Task 2.1 - Draw Line

### Checklist

* [ ] Chọn Distance Tool
* [ ] Click nhiều điểm
* [ ] Hiển thị Polyline

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

* [ ] Draw Line hoạt động

---

## Task 2.2 - Distance Calculation

### Checklist

* [ ] Geodesic Distance
* [ ] Hiển thị đơn vị mét
* [ ] Hiển thị đơn vị km

---

## Example

```text
Distance

2.34 km
```

---

## Deliverable

* [ ] Tính khoảng cách chính xác

---

## Task 2.3 - Multi Segment Distance

### Checklist

* [ ] Nhiều điểm
* [ ] Tổng chiều dài tuyến

---

## Example

```text
A → B → C → D

Total Distance:
12.6 km
```

---

## Deliverable

* [ ] Đo tuyến nhiều đoạn

---

# Epic 3 - Area Tool

## Task 3.1 - Draw Area Polygon

### Checklist

* [ ] Draw Polygon
* [ ] Complete Polygon

---

## Deliverable

* [ ] Polygon đo diện tích hoạt động

---

## Task 3.2 - Area Calculation

### Checklist

* [ ] Tính diện tích m²
* [ ] Tính diện tích km²
* [ ] Tính diện tích ha

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

* [ ] Tính diện tích chính xác

---

# Epic 4 - Perimeter Tool

## Task 4.1 - Polygon Perimeter

### Checklist

* [ ] Tính chu vi Polygon

---

## Example

```text
Perimeter

4.85 km
```

---

## Deliverable

* [ ] Tính chu vi chính xác

---

# Epic 5 - Measurement Visualization

## Task 5.1 - Distance Labels

### Checklist

* [ ] Label từng segment
* [ ] Label tổng khoảng cách

---

## Example

```text
A ---------- B

1.2 km
```

---

## Deliverable

* [ ] Label hiển thị trên bản đồ

---

## Task 5.2 - Area Labels

### Checklist

* [ ] Label diện tích
* [ ] Label chu vi

---

## Example

```text
Area

125 ha
```

---

## Deliverable

* [ ] Label Polygon hiển thị

---

# Epic 6 - Measurement Result Panel

## Task 6.1 - Result Panel

### Checklist

* [ ] Measurement Summary
* [ ] Measurement History

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

* [ ] Result Panel hoạt động

---

# Epic 7 - Measurement History

## Task 7.1 - Save Measurement

### Checklist

* [ ] Lưu kết quả đo
* [ ] Lưu geometry

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

* [ ] Measurement History hoạt động

---

## Task 7.2 - Reload Measurement

### Checklist

* [ ] Hiển thị lại geometry
* [ ] Hiển thị lại kết quả

---

## Deliverable

* [ ] History có thể mở lại

---

# Epic 8 - Backend Measurement APIs

## Task 8.1 - Measurement API

### Checklist

* [ ] Distance API
* [ ] Area API
* [ ] Perimeter API

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

* [ ] Measurement APIs hoạt động

---

# Epic 9 - PostGIS Spatial Functions

## Task 9.1 - Distance Functions

### Checklist

* [ ] ST_Distance()
* [ ] ST_Length()

---

## Example

```sql
SELECT ST_Length(
    geography(geometry)
);
```

---

## Deliverable

* [ ] Tính khoảng cách bằng PostGIS

---

## Task 9.2 - Area Functions

### Checklist

* [ ] ST_Area()

---

## Example

```sql
SELECT ST_Area(
    geography(geometry)
);
```

---

## Deliverable

* [ ] Tính diện tích bằng PostGIS

---

# Epic 10 - Export Measurement

## Task 10.1 - Export GeoJSON

### Checklist

* [ ] Export Geometry
* [ ] Export Metadata

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

* [ ] Export GeoJSON hoạt động

---

## Task 10.2 - Export CSV

### Checklist

* [ ] CSV Export

---

## Example

```csv
Type,Value,Unit
Area,125,ha
```

---

## Deliverable

* [ ] Export CSV hoạt động

---

# Epic 11 - Frontend State Management

## Task 11.1 - Measurement Store

### Checklist

* [ ] Current Measurement
* [ ] Measurement History

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

* [ ] State hoạt động

---

# Epic 12 - Testing

## Task 12.1 - Distance Testing

### Checklist

* [ ] Khoảng cách ngắn
* [ ] Khoảng cách dài

---

## Task 12.2 - Area Testing

### Checklist

* [ ] Polygon nhỏ
* [ ] Polygon lớn

---

## Task 12.3 - Precision Validation

### Checklist

* [ ] Sai số < 2%

---

## KPI

* [ ] Measurement < 1s
* [ ] Render < 500ms

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

* [ ] Draw Line
* [ ] Multi Segment
* [ ] Distance Label

## Area Tool

* [ ] Draw Polygon
* [ ] Area Calculation

## Perimeter Tool

* [ ] Perimeter Calculation

## Backend

* [ ] Measurement APIs
* [ ] PostGIS Functions

## Data

* [ ] Export GeoJSON
* [ ] Export CSV

## Performance

* [ ] Tính toán dưới 1 giây
* [ ] Sai số dưới 2%

---

# Sprint 4 Success Criteria

Người dùng có thể:

* Đo khoảng cách
* Đo diện tích
* Đo chu vi
* Xuất kết quả đo đạc

Sau Sprint 4, hệ thống đã cung cấp đầy đủ các công cụ đo đạc cơ bản của một nền tảng WebGIS chuyên nghiệp và sẵn sàng cho Sprint 5 (Temporal Comparison) — tính năng phân tích thay đổi ảnh vệ tinh theo thời gian, một trong những chức năng quan trọng nhất của đề tài.
