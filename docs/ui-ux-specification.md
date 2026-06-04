# ui-ux-specification.md

# Đặc tả giao diện người dùng (UI/UX)

## 1. Giới thiệu

Tài liệu mô tả thiết kế giao diện người dùng cho hệ thống:

> Nền tảng xử lý và trực quan hóa ảnh vệ tinh hiệu năng cao dựa trên chuẩn STAC

Mục tiêu:

- Đảm bảo trải nghiệm người dùng nhất quán
- Hỗ trợ thao tác GIS trực quan
- Tối ưu không gian hiển thị bản đồ
- Dễ mở rộng trong tương lai

---

# 2. Nguyên tắc thiết kế

## 2.1 Map First

Bản đồ là thành phần trung tâm.

Nguyên tắc:

- Bản đồ chiếm tối thiểu 70% màn hình
- Các panel có thể thu gọn
- Không che khuất dữ liệu địa lý

---

## 2.2 GIS-Oriented Workflow

Người dùng thực hiện:

1. Tìm kiếm khu vực
2. Chọn dữ liệu
3. Phân tích
4. So sánh
5. Xuất kết quả

UI phải hỗ trợ luồng này.

---

## 2.3 Responsive

Hỗ trợ:

- Desktop (ưu tiên)
- Laptop
- Tablet

Mobile chỉ hỗ trợ xem dữ liệu cơ bản.

---

# 3. Sitemap

```text
Home
│
├── Map Viewer
│   ├── Layers
│   ├── Search
│   ├── AOI
│   ├── Measurement
│   ├── Compare
│   └── Detection
│
├── Jobs
│
├── Dashboard
│
├── Settings
│
└── Login
```

---

# 4. Layout tổng thể

## Desktop Layout

```text
+------------------------------------------------+
| Header                                         |
+------------------------------------------------+
| Sidebar |                                      |
|          |                                      |
|          |                                      |
|          |             MAP VIEW                 |
|          |                                      |
|          |                                      |
|          |                                      |
+------------------------------------------------+
| Status Bar                                     |
+------------------------------------------------+
```

---

## Thành phần

### Header

Chứa:

- Logo
- Project Name
- User Menu

---

### Sidebar

Chứa:

- Search
- Layers
- AOI
- Measurement
- Compare
- Detection

---

### Map View

Chiếm phần lớn diện tích màn hình.

---

### Status Bar

Hiển thị:

- Tọa độ chuột
- Zoom Level
- Projection

---

# 5. Header

## Thành phần

```text
+---------------------------------------------------+
| Logo | Satellite Platform | User | Notifications |
+---------------------------------------------------+
```

---

## Chức năng

### Logo

Đi tới trang chủ.

### User Menu

- Profile
- Settings
- Logout

### Notifications

- Job Completed
- Detection Finished

---

# 6. Search Panel

## Mục tiêu

Tìm kiếm vị trí.

---

## Wireframe

```text
+------------------------+
| Search                 |
+------------------------+
| [ Search Location ]    |
+------------------------+
| Results                |
|------------------------|
| Ha Noi                 |
| Ho Chi Minh City       |
| Da Nang                |
+------------------------+
```

---

## Chức năng

### Geocoding

Theo:

- Tên địa điểm
- Địa chỉ

### Reverse Geocoding

Theo:

- Latitude
- Longitude

---

# 7. Layer Panel

## Mục tiêu

Quản lý lớp bản đồ.

---

## Wireframe

```text
+------------------------+
| Layers                 |
+------------------------+
| ☑ OpenStreetMap        |
| ☑ OpenFreeMap          |
| ☑ Sentinel-2           |
| ☐ Landsat              |
+------------------------+
```

---

## Chức năng

- Bật/Tắt Layer
- Thay đổi độ trong suốt
- Sắp xếp thứ tự Layer

---

# 8. AOI Panel

## Mục tiêu

Quản lý khu vực quan tâm.

---

## Wireframe

```text
+----------------------------+
| AOI Manager                |
+----------------------------+
| + Create AOI              |
+----------------------------+
| Noi Bai Airport           |
| Hanoi Urban Area          |
| Hai Phong Port            |
+----------------------------+
```

---

## Chức năng

### Create AOI

- Polygon
- Rectangle

### AOI Operations

- Edit
- Delete
- Zoom To AOI

---

# 9. Measurement Panel

## Wireframe

```text
+-------------------------+
| Measurement             |
+-------------------------+
| Distance Tool           |
| Area Tool               |
| Perimeter Tool          |
+-------------------------+
```

---

## Kết quả

```text
Distance: 5.3 km

Area: 12.5 ha

Perimeter: 4.2 km
```

---

# 10. STAC Search Panel

## Mục tiêu

Tìm kiếm dữ liệu vệ tinh.

---

## Wireframe

```text
+----------------------------------+
| STAC Search                      |
+----------------------------------+
| Collection                       |
| [ Sentinel-2 ▼ ]                |
|                                  |
| Start Date                       |
| [ 2025-01-01 ]                  |
|                                  |
| End Date                         |
| [ 2025-12-31 ]                  |
|                                  |
| [ Search ]                       |
+----------------------------------+
```

---

## Bộ lọc

### Collection

- Sentinel-2
- Landsat
- PlanetScope

### Time Range

- Start Date
- End Date

### AOI

- Current AOI
- Current Viewport

---

# 11. Search Result Panel

## Wireframe

```text
+--------------------------------+
| Search Results                |
+--------------------------------+
| Sentinel-2                    |
| 2025-02-15                    |
| Cloud Cover: 8%              |
+--------------------------------+
| Sentinel-2                    |
| 2025-03-01                    |
| Cloud Cover: 3%              |
+--------------------------------+
```

---

## Chức năng

### Preview

Hiển thị thumbnail.

### Open

Hiển thị trên bản đồ.

---

# 12. Compare View

## Mục tiêu

So sánh ảnh.

---

## Layout

```text
+------------------------------------------------+
| Image A             | Image B                  |
|                      |                          |
|                      |                          |
|                      |                          |
+------------------------------------------------+
```

---

## Swipe Mode

```text
+------------------------------------------------+
|     Image A | Image B                          |
|             |                                  |
|             |                                  |
|             |                                  |
+------------------------------------------------+
```

---

## Chức năng

- Đồng bộ zoom
- Đồng bộ pan
- Swipe Comparison

---

# 13. Detection Panel

## Mục tiêu

Chạy AI Detection.

---

## Wireframe

```text
+--------------------------------+
| Detection                     |
+--------------------------------+
| Model                         |
| [ YOLO ▼ ]                    |
|                               |
| Object Type                   |
| [ Vehicle ▼ ]                 |
|                               |
| [ Run Detection ]             |
+--------------------------------+
```

---

## Các loại Detection

- Vehicle
- Aircraft
- Ship

---

# 14. Detection Result

## Wireframe

```text
+--------------------------------+
| Detection Result             |
+--------------------------------+
| Vehicle: 24                  |
| Aircraft: 3                  |
| Ship: 7                      |
+--------------------------------+
```

---

## Trên bản đồ

```text
+-------------------------+
| □ Vehicle               |
| □ Vehicle               |
| □ Aircraft              |
+-------------------------+
```

Bounding Box hiển thị trực tiếp.

---

# 15. Jobs Monitor

## Mục tiêu

Theo dõi tác vụ nền.

---

## Wireframe

```text
+-----------------------------------+
| Jobs                             |
+-----------------------------------+
| Detection Job #1                 |
| [█████████░░] 90%                |
+-----------------------------------+
| Detection Job #2                 |
| [█████░░░░░░] 50%                |
+-----------------------------------+
```

---

## Trạng thái

- Pending
- Running
- Completed
- Failed

---

# 16. Dashboard

## Mục tiêu

Thống kê hệ thống.

---

## KPI Cards

```text
+----------------+
| Total AOIs     |
| 120            |
+----------------+

+----------------+
| Total Jobs     |
| 250            |
+----------------+
```

---

## Charts

### Job Statistics

- Completed
- Failed

### Detection Statistics

- Vehicle
- Aircraft
- Ship

---

# 17. Settings

## Cấu hình

### Theme

- Light
- Dark

### Map Settings

- Default Layer
- Default Zoom

### Notification Settings

- Email
- Browser

---

# 18. Mobile Layout

## Mobile

```text
+--------------------+
| Header            |
+--------------------+
|                    |
|       MAP          |
|                    |
+--------------------+
| Bottom Toolbar     |
+--------------------+
```

---

## Toolbar

- Search
- Layers
- AOI
- Settings

---

# 19. Design System

## Framework

### UI

```text
Material UI (MUI)
```

---

### Styling

```text
TailwindCSS
```

---

### Icons

```text
Lucide Icons
```

---

### Maps

```text
MapLibre GL JS
```

---

# 20. Màu sắc

## Primary

```text
#1976D2
```

---

## Secondary

```text
#4CAF50
```

---

## Warning

```text
#FF9800
```

---

## Error

```text
#F44336
```

---

# 21. Typography

## Font

```text
Inter
```

---

## Heading

```text
Font Weight: 600
```

---

## Body

```text
Font Weight: 400
```

---

# 22. Accessibility

## Yêu cầu

- Keyboard Navigation
- Screen Reader Support
- Color Contrast Compliance

---

# 23. Kết luận

Giao diện được thiết kế theo triết lý:

- Map First
- GIS-Oriented
- Responsive
- Scalable

Ưu tiên trải nghiệm trực quan cho người dùng làm việc với dữ liệu ảnh vệ tinh, đồng thời đảm bảo khả năng mở rộng khi bổ sung các tính năng AI và phân tích dữ liệu trong tương lai.