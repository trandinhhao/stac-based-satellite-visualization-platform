# Thiết kế API

## 1. Tổng quan

Backend cung cấp REST API versioned dưới prefix `/api/v1` và một WebSocket
endpoint riêng tại `/ws/jobs`. API hiện tại phục vụ các nhóm chức năng:

- Health check.
- AOI management.
- Spatial measurement.
- STAC search.
- Planet imagery proxy.
- Job management.
- AI detection.
- Realtime job progress.

Base URL local:

```text
http://localhost:8000/api/v1
```

Swagger:

```text
http://localhost:8000/docs
```

## 2. Quy ước chung

API hiện dùng response trực tiếp theo từng endpoint, chưa có envelope thống
nhất dạng `{ success, data, message }`. Lỗi được trả bằng `HTTPException` của
FastAPI, thường có dạng:

```json
{
  "detail": "Thông báo lỗi"
}
```

Các status code thường gặp:

| Code | Ý nghĩa |
| --- | --- |
| 200 | Thành công |
| 201 | Tạo mới thành công |
| 400 | Dữ liệu đầu vào không hợp lệ |
| 404 | Không tìm thấy tài nguyên |
| 422 | Validation error của FastAPI/Pydantic |
| 500 | Lỗi hệ thống hoặc service phụ thuộc |

## 3. Health endpoints

### `GET /health`

Kiểm tra API đang sống.

Response:

```json
{
  "status": "ok",
  "version": "v1"
}
```

### `GET /api/v1/health`

Alias của `/health`.

### `GET /health/db`

Kiểm tra kết nối PostgreSQL.

### `GET /health/redis`

Kiểm tra kết nối Redis.

### `GET /health/rabbitmq`

Kiểm tra kết nối RabbitMQ.

## 4. AOI APIs

### `POST /api/v1/aois`

Tạo AOI mới.

Request:

```json
{
  "name": "Noi Bai Airport",
  "description": "Khu vực giám sát sân bay",
  "geometry": {
    "type": "Polygon",
    "coordinates": [
      [
        [105.8000, 21.0200],
        [105.8200, 21.0200],
        [105.8200, 21.0400],
        [105.8000, 21.0400],
        [105.8000, 21.0200]
      ]
    ]
  }
}
```

Response:

```json
{
  "id": "uuid",
  "name": "Noi Bai Airport",
  "description": "Khu vực giám sát sân bay",
  "geometry": {
    "type": "Polygon",
    "coordinates": []
  },
  "area": 123456.78,
  "perimeter": 1500.25,
  "created_at": "2026-07-06T00:00:00",
  "updated_at": "2026-07-06T00:00:00"
}
```

### `GET /api/v1/aois`

Lấy danh sách AOI, sắp xếp mới nhất trước.

### `GET /api/v1/aois/{aoi_id}`

Lấy chi tiết AOI.

### `PUT /api/v1/aois/{aoi_id}`

Cập nhật AOI. Có thể gửi một phần:

```json
{
  "name": "Tên mới",
  "description": "Mô tả mới"
}
```

Nếu cập nhật `geometry`, backend tính lại `area` và `perimeter`.

### `DELETE /api/v1/aois/{aoi_id}`

Xóa AOI. Backend cũng xóa các job và detection liên quan.

### `GET /api/v1/aois/{aoi_id}/export`

Export AOI thành GeoJSON Feature.

### `POST /api/v1/aois/import`

Import AOI từ file GeoJSON.

Form-data:

```text
file=<aoi.geojson>
```

Hỗ trợ:

- FeatureCollection.
- Feature.
- Polygon trực tiếp.

## 5. Spatial measurement API

### `POST /api/v1/measure`

Tính khoảng cách hoặc diện tích/chu vi.

LineString request:

```json
{
  "geometry": {
    "type": "LineString",
    "coordinates": [[105.8, 21.0], [105.9, 21.1]]
  }
}
```

LineString response:

```json
{
  "type": "distance",
  "distance": 15235.3,
  "unit": "m"
}
```

Polygon request:

```json
{
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[105.8, 21.0], [105.9, 21.0], [105.9, 21.1], [105.8, 21.0]]]
  }
}
```

Polygon response:

```json
{
  "type": "area",
  "area": 9123456.7,
  "perimeter": 12345.6,
  "unit_area": "m2",
  "unit_perimeter": "m"
}
```

## 6. STAC APIs

### `GET /api/v1/stac/collections`

Trả danh sách collection khả dụng. Kết quả được cache trong Redis 1 giờ.

### `POST /api/v1/stac/search`

Tìm kiếm item.

Request:

```json
{
  "collections": ["sentinel-2"],
  "datetime": "2026-01-01/2026-01-31",
  "bbox": [105.7, 20.9, 106.0, 21.3],
  "limit": 20
}
```

Hoặc dùng geometry:

```json
{
  "collections": ["sentinel-2"],
  "datetime": "2026-01-01",
  "intersects": {
    "type": "Polygon",
    "coordinates": []
  },
  "limit": 20
}
```

Backend tự normalize date:

- `YYYY-MM-DD` -> `YYYY-MM-DDT00:00:00Z/YYYY-MM-DDT23:59:59Z`
- `start/end` -> start đầu ngày, end cuối ngày nếu chỉ có date.

Kết quả search được cache 5 phút theo hash của payload.

## 7. Planet proxy APIs

Các endpoint này yêu cầu `PLANET_API_KEY`.

### `GET /api/v1/stac/planet/tiles/{mosaic_name}/{z}/{x}/{y}.png`

Proxy tile Planet basemap.

### `GET /api/v1/stac/planet/tiles/PSScene/{scene_id}/{z}/{x}/{y}.png`

Proxy tile của một PlanetScope scene.

### `GET /api/v1/stac/planet/thumbnail/{scene_id}`

Lấy thumbnail của scene.

Mục đích proxy là tránh để lộ API key ở frontend.

## 8. Job APIs

### `POST /api/v1/jobs`

Tạo job.

Request:

```json
{
  "job_type": "object_detection",
  "aoi_id": "uuid",
  "payload": {
    "collection": "sentinel-2"
  }
}
```

Response:

```json
{
  "job_id": "uuid",
  "status": "queued"
}
```

Code hiện tại chỉ xử lý nền thực tế cho `object_detection`.

### `GET /api/v1/jobs`

Lấy danh sách job. Hỗ trợ filter:

```text
GET /api/v1/jobs?status=running&job_type=object_detection
```

### `GET /api/v1/jobs/{job_id}`

Lấy chi tiết job.

### `DELETE /api/v1/jobs/{job_id}`

Hủy job nếu chưa completed/failed/cancelled.

## 9. Detection APIs

### `POST /api/v1/detections`

Tạo detection job nhanh.

Request:

```json
{
  "aoi_id": "uuid",
  "model": "yolo26",
  "collection": "sentinel-2"
}
```

Response:

```json
{
  "job_id": "uuid",
  "status": "queued"
}
```

### `GET /api/v1/detections/{job_id}`

Lấy kết quả detection khi job đã completed.

Response:

```json
{
  "job_id": "uuid",
  "objects": [
    {
      "object_class": "aircraft",
      "confidence": 0.94,
      "bbox": [105.8015, 21.0251, 105.8032, 21.0272]
    }
  ]
}
```

Nếu job chưa hoàn thành, API trả 400.

## 10. WebSocket API

Endpoint:

```text
ws://localhost:8000/ws/jobs
```

Event mẫu:

```json
{
  "event": "job_progress",
  "job_id": "uuid",
  "progress": 65,
  "status": "running",
  "job_type": "object_detection"
}
```

Các event:

- `job_started`
- `job_progress`
- `job_completed`
- `job_failed`
- `job_cancelled`

Client có thể gửi `ping`, server trả `pong`.

## 11. API chưa triển khai đầy đủ

Các API sau từng xuất hiện trong tài liệu thiết kế ban đầu nhưng chưa phải API
hoàn chỉnh trong code hiện tại:

- `/auth/*`
- `/statistics`
- `/compare`
- `/tiles/{collection}/...` riêng trong backend
- `/stac/search/aoi`

Nếu cần dùng, nên triển khai bổ sung thay vì coi chúng là API sẵn có.

