# Sprint 1 - Core Mapping & Navigation

## Thông tin Sprint

**Mục tiêu:** Xây dựng WebGIS Viewer cơ bản cho phép người dùng xem bản đồ, điều hướng và quản lý layer.

**Thời lượng:** 1 tuần

**Phụ thuộc:**

* Sprint 0 hoàn thành
* Docker Stack hoạt động
* Frontend React hoạt động
* Backend FastAPI hoạt động

---

# Mục tiêu Sprint

Sau Sprint 1, người dùng có thể:

* Xem bản đồ
* Zoom In / Zoom Out
* Pan bản đồ
* Chuyển đổi Layer
* Tìm kiếm địa điểm
* Reset về vị trí mặc định

---

# Epic 1 - Map Viewer

## Task 1.1 - Khởi tạo MapLibre

### Checklist

* [x] Tạo Map Component
* [x] Render MapLibre
* [x] Hiển thị bản đồ toàn màn hình

### Deliverable

* [x] Hiển thị được OpenStreetMap

---

## Task 1.2 - Thiết lập Map Configuration

### Checklist

* [x] Default Center
* [x] Default Zoom
* [x] Max Zoom
* [x] Min Zoom

### Config

```ts
Center: [105.83416, 21.02776]
Zoom: 6
```

---

## Task 1.3 - Responsive Layout

### Checklist

* [x] Desktop Layout
* [x] Tablet Layout
* [x] Fullscreen Map

---

## Deliverable

* [x] Map hiển thị ổn định trên trình duyệt

---

# Epic 2 - Navigation Controls

## Task 2.1 - Zoom Controls

### Checklist

* [x] Zoom In
* [x] Zoom Out

---

## Task 2.2 - Compass Control

### Checklist

* [x] Rotate Map
* [x] Reset Rotation

---

## Task 2.3 - Scale Control

### Checklist

* [x] Hiển thị tỷ lệ bản đồ

---

## Deliverable

* [x] Bộ điều hướng hoạt động đầy đủ

---

# Epic 3 - Base Layers

## Task 3.1 - OpenStreetMap Layer

### Checklist

* [x] Thêm OSM Layer

---

## Task 3.2 - OpenFreeMap Layer

### Checklist

* [x] Thêm OpenFreeMap Layer

---

## Task 3.3 - Satellite Layer

### Checklist

* [x] Thêm Satellite Basemap

---

## Deliverable

* [x] Có tối thiểu 3 layer

---

# Epic 4 - Layer Manager

## Task 4.1 - Layer Panel UI

### Checklist

* [x] Tạo Sidebar Layer Panel
* [x] Danh sách Layer

---

## Task 4.2 - Toggle Layer

### Checklist

* [x] Bật Layer
* [x] Tắt Layer

---

## Task 4.3 - Active Layer

### Checklist

* [x] Chỉ định Layer mặc định

---

## Deliverable

* [x] Chuyển đổi layer thành công

---

# Epic 5 - Search Location

## Task 5.1 - Geocoding Service

### Checklist

* [ ] Nghiên cứu Nominatim API
* [ ] Tạo Search Service

---

## Task 5.2 - Search UI

### Checklist

* [ ] Search Input
* [ ] Search Button
* [ ] Result List

---

## Task 5.3 - Fly To Location

### Checklist

* [ ] Chọn địa điểm
* [ ] Fly To Position

---

## Example

Người dùng nhập:

```text
Ha Noi
```

Kết quả:

```text
Hà Nội, Việt Nam
```

Bản đồ di chuyển tới vị trí tương ứng.

---

## Deliverable

* [ ] Search hoạt động

---

# Epic 6 - Coordinate Display

## Task 6.1 - Mouse Coordinate

### Checklist

* [ ] Hiển thị Latitude
* [ ] Hiển thị Longitude

---

## Task 6.2 - Status Bar

### Checklist

* [ ] Current Zoom
* [ ] Current Coordinates

---

## Example

```text
Lat: 21.028
Lng: 105.834
Zoom: 12
```

---

## Deliverable

* [ ] Hiển thị tọa độ realtime

---

# Epic 7 - Reset View

## Task 7.1 - Home Button

### Checklist

* [ ] Tạo Home Button

---

## Task 7.2 - Reset Map

### Checklist

* [ ] Reset Center
* [ ] Reset Zoom

---

## Deliverable

* [ ] Reset hoạt động

---

# Epic 8 - Frontend Architecture

## Task 8.1 - State Management

### Checklist

* [ ] Zustand Store

---

## State

```ts
MapState

center
zoom

selectedLayer

searchResults
```

---

## Task 8.2 - API Layer

### Checklist

* [ ] Axios Instance
* [ ] Base URL

---

## Task 8.3 - React Query

### Checklist

* [ ] Query Client
* [ ] Search Cache

---

## Deliverable

* [ ] Frontend Structure hoàn chỉnh

---

# Epic 9 - UI Layout

## Task 9.1 - Header

### Checklist

* [ ] Logo
* [ ] Project Name

---

## Task 9.2 - Sidebar

### Checklist

* [ ] Search Panel
* [ ] Layer Panel

---

## Task 9.3 - Status Bar

### Checklist

* [ ] Zoom
* [ ] Coordinates

---

## Deliverable

* [ ] Layout giống WebGIS thực tế

---

# Epic 10 - Testing

## Task 10.1 - Browser Testing

### Checklist

* [ ] Chrome
* [ ] Edge
* [ ] Firefox

---

## Task 10.2 - Map Performance

### Checklist

* [ ] Pan mượt
* [ ] Zoom mượt

---

## KPI

* [ ] Initial Load < 3s
* [ ] Zoom Response < 500ms

---

# Sprint 1 Demo Scenario

## Demo Flow

### Bước 1

Mở ứng dụng

---

### Bước 2

Bản đồ hiển thị

---

### Bước 3

Zoom tới Hà Nội

---

### Bước 4

Search:

```text
Noi Bai Airport
```

---

### Bước 5

Fly tới Nội Bài

---

### Bước 6

Đổi từ OSM sang Satellite

---

### Bước 7

Reset về vị trí mặc định

---

# Sprint 1 Definition Of Done

## Mapping

* [ ] MapLibre hoạt động
* [ ] OSM hoạt động
* [ ] Satellite Layer hoạt động

## Navigation

* [ ] Zoom hoạt động
* [ ] Pan hoạt động
* [ ] Reset hoạt động

## Search

* [ ] Geocoding hoạt động
* [ ] Fly To hoạt động

## UI

* [ ] Header hoàn chỉnh
* [ ] Sidebar hoàn chỉnh
* [ ] Status Bar hoàn chỉnh

## Performance

* [ ] Load dưới 3 giây
* [ ] Không có lỗi nghiêm trọng

---

# Sprint 1 Success Criteria

Người dùng truy cập hệ thống có thể:

* Xem bản đồ
* Điều hướng bản đồ
* Chuyển đổi layer
* Tìm kiếm địa điểm
* Reset vị trí

Sprint 1 được xem là hoàn thành khi hệ thống đã trở thành một WebGIS Viewer cơ bản có thể demo cho mentor và tiếp tục tích hợp STAC ở Sprint 2.
