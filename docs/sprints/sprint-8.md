# Sprint 8 - AI Detection & Satellite Image Intelligence

## Thông tin Sprint

**Mục tiêu:** Xây dựng hệ thống phát hiện đối tượng trên ảnh vệ tinh sử dụng AI và hiển thị kết quả trực tiếp trên bản đồ.

**Thời lượng:** 1 tuần

**Loại Sprint:**

Optional / Bonus Feature

**Phụ thuộc:**

* Sprint 0 → Sprint 7 hoàn thành
* STAC Search hoạt động
* AOI hoạt động
* Async Processing hoạt động
* Realtime Communication hoạt động

---

# Mục tiêu Sprint

Sau Sprint 8, người dùng có thể:

* Chọn vùng AOI
* Chạy AI Detection
* Theo dõi tiến trình xử lý
* Xem Bounding Boxes
* Xem danh sách đối tượng phát hiện được
* Xuất kết quả Detection

---

# Epic 1 - AI Architecture

## Task 1.1 - Thiết kế AI Pipeline

### Checklist

* [ ] Detection Service
* [ ] AI Worker
* [ ] Result Storage

---

## Flow

```text
User

↓

Select AOI

↓

Create Detection Job

↓

Celery Worker

↓

YOLO Inference

↓

Store Result

↓

Realtime Notification

↓

Frontend
```

---

## Deliverable

* [ ] AI Pipeline hoàn chỉnh

---

# Epic 2 - AI Model Research

## Task 2.1 - Satellite Detection Dataset

### Checklist

* [ ] xView Dataset
* [ ] DOTA Dataset
* [ ] DIOR Dataset

---

## Nghiên cứu

### xView

* Vehicle
* Ship
* Aircraft
* Building

---

### DOTA

* Large-scale aerial object detection

---

### DIOR

* Remote sensing object detection

---

## Deliverable

* [ ] Chọn dataset phù hợp

---

## Task 2.2 - Model Evaluation

### Checklist

* [ ] YOLOv8
* [ ] YOLOv11
* [ ] RT-DETR (Optional)

---

## Tiêu chí

* Accuracy
* Speed
* Ease of Deployment

---

## Deliverable

* [ ] Chọn model chính thức

---

# Epic 3 - AI Service

## Task 3.1 - Detection Service

### Checklist

* [ ] Load Model
* [ ] Inference API

---

## Structure

```text
backend/

services/

ai/
├── detector.py
├── inference.py
├── model_loader.py
└── utils.py
```

---

## Deliverable

* [ ] AI Service hoạt động

---

## Task 3.2 - Model Management

### Checklist

* [ ] Model Cache
* [ ] Lazy Loading

---

## Deliverable

* [ ] Model Load một lần duy nhất

---

# Epic 4 - Detection Job APIs

## Task 4.1 - Create Detection Job

### Checklist

* [ ] Detection API

---

### Endpoint

```http
POST /api/v1/detections
```

---

### Request

```json
{
  "aoi_id": "uuid",
  "model": "yolov8"
}
```

---

### Response

```json
{
  "job_id": "uuid",
  "status": "queued"
}
```

---

## Deliverable

* [ ] Detection Job được tạo

---

## Task 4.2 - Get Detection Result

### Checklist

* [ ] Result API

---

### Endpoint

```http
GET /api/v1/detections/{job_id}
```

---

## Deliverable

* [ ] Result API hoạt động

---

# Epic 5 - Async AI Processing

## Task 5.1 - Celery Detection Worker

### Checklist

* [ ] Detection Queue
* [ ] AI Worker

---

## Queue

```text
ai-detection
```

---

## Deliverable

* [ ] Worker hoạt động

---

## Task 5.2 - Progress Tracking

### Checklist

* [ ] Realtime Progress

---

## Example

```text
Downloading Tiles

20%

Inference

65%

Post Processing

90%
```

---

## Deliverable

* [ ] Tracking hoạt động

---

# Epic 6 - Detection Result Schema

## Task 6.1 - Database Design

### Checklist

* [ ] Deployed SQLAlchemy Model in `models/detection.py`
* [ ] DB Schema aligned with existing `detections` table

---

## Schema (Implemented & Migrated in Sprint 6)

```sql
CREATE TABLE detections (
    id UUID PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    object_class VARCHAR(100) NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    bbox JSONB NOT NULL, -- [xmin, ymin, xmax, ymax]
    created_at TIMESTAMP
);
```

---

## Object Schema (Bounding Box format in geographic coordinates)

```json
{
  "class": "aircraft",
  "confidence": 0.94,
  "bbox": [
    105.8015,
    21.0251,
    105.8032,
    21.0272
  ]
}
```

---

## Deliverable

* [ ] Detection Result lưu DB

---

# Epic 7 - Detection Visualization

## Task 7.1 - Bounding Box Layer

### Checklist

* [ ] Draw Bounding Box
* [ ] Draw Label

---

## Example

```text
┌──────────────┐
│ Aircraft     │
└──────────────┘
```

---

## Deliverable

* [ ] Bounding Box hiển thị

---

## Task 7.2 - Confidence Visualization

### Checklist

* [ ] Confidence Label

---

## Example

```text
Aircraft

94%
```

---

## Deliverable

* [ ] Confidence hiển thị

---

# Epic 8 - Detection Result Panel

## Task 8.1 - Detection List

### Checklist

* [ ] Aircraft List
* [ ] Vehicle List
* [ ] Ship List

---

## Wireframe

```text
+-----------------------+
| Detection Results     |
+-----------------------+
| Aircraft (5)          |
| Vehicle (24)          |
| Ship (3)              |
+-----------------------+
```

---

## Deliverable

* [ ] Result Panel hoạt động

---

## Task 8.2 - Detection Detail

### Checklist

* [ ] Confidence
* [ ] Coordinates

---

## Deliverable

* [ ] Detail Viewer hoạt động

---

# Epic 9 - Export Detection Result

## Task 9.1 - Export GeoJSON

### Checklist

* [ ] GeoJSON Export

---

## Example

```json
{
  "type": "Feature",
  "properties": {
    "class": "aircraft",
    "confidence": 0.94
  }
}
```

---

## Deliverable

* [ ] Export GeoJSON

---

## Task 9.2 - Export CSV

### Checklist

* [ ] CSV Export

---

## Deliverable

* [ ] Export CSV

---

# Epic 10 - Frontend State Management

## Task 10.1 - Detection Store

### Checklist

* [ ] Detection Result
* [ ] Selected Detection

---

## Example

```ts
interface DetectionState {
  detections: Detection[];
}
```

---

## Deliverable

* [ ] State hoạt động

---

# Epic 11 - Performance Optimization

## Task 11.1 - Tile Cropping

### Checklist

* [ ] AOI Crop
* [ ] Tile Extraction

---

## Deliverable

* [ ] Giảm dữ liệu đầu vào

---

## Task 11.2 - Model Optimization

### Checklist

* [ ] FP16
* [ ] Batch Inference

---

## Deliverable

* [ ] Tăng tốc inference

---

# Epic 12 - Testing

## Task 12.1 - Detection Accuracy

### Checklist

* [ ] Vehicle
* [ ] Ship
* [ ] Aircraft

---

## Task 12.2 - Inference Testing

### Checklist

* [ ] Small AOI
* [ ] Large AOI

---

## Task 12.3 - Stress Testing

### Checklist

* [ ] Multiple Detection Jobs

---

## KPI

* [ ] Detection dưới 30 giây
* [ ] Accuracy > 80%
* [ ] 5 Concurrent Jobs

---

# Sprint 8 Demo Scenario

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

Nhấn:

```text
Run Detection
```

---

### Bước 4

Chọn:

```text
Aircraft Detection
```

---

### Bước 5

Detection Job được tạo

---

### Bước 6

Realtime Progress

```text
10%

35%

60%

100%
```

---

### Bước 7

Bounding Boxes xuất hiện

---

### Bước 8

Detection Panel hiển thị

```text
Aircraft

12 Objects
```

---

### Bước 9

Click vào Aircraft

---

### Bước 10

Map zoom tới vị trí Aircraft

---

### Bước 11

Export GeoJSON

---

# Sprint 8 Definition Of Done

## AI

* [ ] YOLO Model hoạt động
* [ ] Inference thành công

## Backend

* [ ] Detection APIs
* [ ] Async Detection Worker

## Frontend

* [ ] Detection Layer
* [ ] Result Panel

## Realtime

* [ ] Progress Tracking
* [ ] Notifications

## Export

* [ ] GeoJSON
* [ ] CSV

## Performance

* [ ] Inference dưới 30 giây
* [ ] 5 Detection Jobs đồng thời

---

# Sprint 8 Success Criteria

Người dùng có thể:

* Chạy AI Detection trên AOI
* Theo dõi tiến trình realtime
* Xem Bounding Boxes
* Xem danh sách đối tượng
* Xuất kết quả phân tích

Hệ thống đã được nâng cấp từ một nền tảng WebGIS thuần túy thành một nền tảng Geospatial AI Platform có khả năng phân tích ảnh vệ tinh bằng trí tuệ nhân tạo.

Đây là tính năng Bonus nhưng có giá trị trình diễn rất cao trong buổi bảo vệ hoặc demo với mentor Viettel Digital Talent.
