# Sprint 5 - Temporal Comparison & Change Analysis

## Thông tin Sprint

**Mục tiêu:** Xây dựng chức năng so sánh ảnh vệ tinh theo thời gian nhằm hỗ trợ phát hiện và đánh giá sự thay đổi của khu vực nghiên cứu.

**Thời lượng:** 1 tuần

**Phụ thuộc:**

* Sprint 0 hoàn thành
* Sprint 1 hoàn thành
* Sprint 2 hoàn thành
* Sprint 3 hoàn thành
* Sprint 4 hoàn thành
* STAC Search hoạt động
* AOI Search hoạt động

---

# Mục tiêu Sprint

Sau Sprint 5, người dùng có thể:

* Chọn 2 ảnh vệ tinh ở 2 thời điểm khác nhau
* So sánh ảnh theo dạng Side-by-Side
* So sánh ảnh bằng Swipe Slider
* So sánh trong cùng AOI
* Hiển thị metadata của cả hai ảnh
* Xuất kết quả so sánh

---

# Epic 1 - Temporal Comparison Architecture

## Task 1.1 - Thiết kế Compare Module

### Checklist

* [ ] Compare Store
* [ ] Compare Service
* [ ] Compare Viewer

---

## Cấu trúc

```text
frontend/
└── features/
    └── comparison/
        ├── components/
        ├── hooks/
        ├── services/
        └── store/
```

---

## Deliverable

* [ ] Compare Module được khởi tạo

---

# Epic 2 - Temporal Search

## Task 2.1 - Search Images By AOI

### Checklist

* [ ] Search theo AOI
* [ ] Search theo thời gian

---

### Example

```text
AOI:
Noi Bai Airport

Date Range:
2024
```

---

## Deliverable

* [ ] Danh sách ảnh theo AOI

---

## Task 2.2 - Select Comparison Images

### Checklist

* [ ] Chọn ảnh T1
* [ ] Chọn ảnh T2

---

### Example

```text
Image A

2024-01-15

Image B

2025-01-15
```

---

## Deliverable

* [ ] Chọn được 2 ảnh để so sánh

---

# Epic 3 - Comparison APIs

## Task 3.1 - Compare Endpoint

### Checklist

* [ ] API Compare

---

### Endpoint

```http
POST /api/compare
```

---

### Request

```json
{
  "imageA": "item-id-1",
  "imageB": "item-id-2"
}
```

---

### Response

```json
{
  "imageA": {},
  "imageB": {}
}
```

---

## Deliverable

* [ ] Compare API hoạt động

---

# Epic 4 - Side By Side Viewer

## Task 4.1 - Dual Map Layout

### Checklist

* [ ] Left Map
* [ ] Right Map

---

## Wireframe

```text
+-------------------+-------------------+
|                   |                   |
|      Image A      |      Image B      |
|                   |                   |
+-------------------+-------------------+
```

---

## Deliverable

* [ ] Hai ảnh hiển thị song song

---

## Task 4.2 - Sync Navigation

### Checklist

* [ ] Sync Zoom
* [ ] Sync Pan

---

## User Flow

```text
Zoom Left Map

↓

Right Map Zoom theo
```

---

## Deliverable

* [ ] Đồng bộ điều hướng

---

# Epic 5 - Swipe Comparison

## Task 5.1 - Swipe Slider

### Checklist

* [ ] Overlay 2 ảnh
* [ ] Slider Control

---

## Wireframe

```text
Image A | Image B

██████████│░░░░░░░░░░
          ▲
       Slider
```

---

## Deliverable

* [ ] Swipe hoạt động

---

## Task 5.2 - Opacity Control

### Checklist

* [ ] 0% → 100%

---

## Deliverable

* [ ] Điều chỉnh độ trong suốt

---

# Epic 6 - Metadata Comparison

## Task 6.1 - Metadata Panel

### Checklist

* [ ] Acquisition Date
* [ ] Cloud Cover
* [ ] Satellite
* [ ] Collection

---

## Example

```text
Image A

Date:
2024-01-15

Cloud:
4%

----------------

Image B

Date:
2025-01-15

Cloud:
7%
```

---

## Deliverable

* [ ] Metadata hiển thị đầy đủ

---

# Epic 7 - Temporal Timeline

## Task 7.1 - Timeline Viewer

### Checklist

* [ ] Danh sách ảnh theo thời gian

---

## Wireframe

```text
2023 ---- 2024 ---- 2025 ---- 2026

  ●         ●         ●
```

---

## Deliverable

* [ ] Timeline hoạt động

---

## Task 7.2 - Quick Selection

### Checklist

* [ ] Click Timeline
* [ ] Chọn ảnh

---

## Deliverable

* [ ] Timeline tương tác được

---

# Epic 8 - Change Detection Summary

## Task 8.1 - Difference Statistics

### Checklist

* [ ] Số ngày giữa 2 ảnh
* [ ] Chênh lệch cloud cover

---

## Example

```text
Days Difference

365 days

Cloud Difference

+3%
```

---

## Deliverable

* [ ] Thống kê cơ bản hoạt động

---

## Task 8.2 - AOI Summary

### Checklist

* [ ] AOI Name
* [ ] Area
* [ ] Image Count

---

## Deliverable

* [ ] Summary Panel hoàn chỉnh

---

# Epic 9 - Export Comparison

## Task 9.1 - Export Metadata

### Checklist

* [ ] JSON Export

---

### Example

```json
{
  "imageA": {},
  "imageB": {}
}
```

---

## Deliverable

* [ ] Export JSON hoạt động

---

## Task 9.2 - Export Screenshot

### Checklist

* [ ] Capture Comparison View

---

## Deliverable

* [ ] Export PNG hoạt động

---

# Epic 10 - Frontend State Management

## Task 10.1 - Comparison Store

### Checklist

* [ ] Image A
* [ ] Image B
* [ ] Comparison Mode

---

## Example

```ts
interface ComparisonState {
  imageA?: STACItem;
  imageB?: STACItem;

  mode:
    | "side-by-side"
    | "swipe";
}
```

---

## Deliverable

* [ ] State hoạt động

---

# Epic 11 - Testing

## Task 11.1 - Side By Side Testing

### Checklist

* [ ] Sync Pan
* [ ] Sync Zoom

---

## Task 11.2 - Swipe Testing

### Checklist

* [ ] Slider
* [ ] Opacity

---

## Task 11.3 - Performance Testing

### Checklist

* [ ] Tile Loading
* [ ] Memory Usage

---

## KPI

* [ ] Comparison Load < 5s
* [ ] Swipe Response < 200ms

---

# Sprint 5 Demo Scenario

## Demo Flow

### Bước 1

Mở ứng dụng

---

### Bước 2

Chọn AOI:

```text
Noi Bai Airport
```

---

### Bước 3

Search Sentinel-2 Images

---

### Bước 4

Chọn:

```text
Image A

2024-01-15
```

---

### Bước 5

Chọn:

```text
Image B

2025-01-15
```

---

### Bước 6

Mở:

```text
Side By Side Mode
```

---

### Bước 7

Zoom vào đường băng

---

### Bước 8

Hai bản đồ đồng bộ

---

### Bước 9

Chuyển sang:

```text
Swipe Mode
```

---

### Bước 10

Kéo Slider để so sánh

---

### Bước 11

Xem Metadata

---

### Bước 12

Export Screenshot

---

# Sprint 5 Definition Of Done

## Search

* [ ] Search theo AOI
* [ ] Chọn ảnh T1
* [ ] Chọn ảnh T2

## Comparison

* [ ] Side By Side
* [ ] Swipe Slider

## Metadata

* [ ] Metadata Viewer
* [ ] Difference Statistics

## Export

* [ ] JSON Export
* [ ] Screenshot Export

## Performance

* [ ] Tải ảnh dưới 5 giây
* [ ] Swipe dưới 200ms

---

# Sprint 5 Success Criteria

Người dùng có thể:

* Chọn hai ảnh vệ tinh khác thời điểm
* So sánh trực quan
* So sánh metadata
* Theo dõi thay đổi theo thời gian

Sau Sprint 5, hệ thống đã đáp ứng gần như toàn bộ các yêu cầu nghiệp vụ cốt lõi của đề tài Viettel Digital Talent. Các Sprint tiếp theo (Sprint 6 và Sprint 7) sẽ tập trung vào kiến trúc hiệu năng cao gồm RabbitMQ, Celery, Redis, WebSocket và Realtime Processing — đúng với phần "Architecture & Performance" được nêu trong đề bài.
