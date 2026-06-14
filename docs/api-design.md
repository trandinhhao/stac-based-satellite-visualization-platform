# api-design.md

# Thiết kế API

## 1. Tổng quan

Hệ thống sử dụng kiến trúc RESTful API kết hợp với WebSocket để cung cấp:

* Truy vấn dữ liệu bản đồ
* Truy vấn dữ liệu STAC
* Quản lý AOI
* Quản lý tác vụ nền
* AI Detection
* Realtime Progress Tracking

---

# 2. API Conventions

## Base URL

### Development

```text
http://localhost:8000/api/v1
```

### Production

```text
https://api.domain.com/api/v1
```

---

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

---

### Error Response

```json
{
  "success": false,
  "message": "Validation Error",
  "errors": []
}
```

---

## HTTP Status Codes

| Code | Ý nghĩa               |
| ---- | --------------------- |
| 200  | Success               |
| 201  | Created               |
| 400  | Bad Request           |
| 401  | Unauthorized          |
| 403  | Forbidden             |
| 404  | Not Found             |
| 409  | Conflict              |
| 422  | Validation Error      |
| 500  | Internal Server Error |

---

# 3. Authentication APIs

## Đăng ký tài khoản

### Endpoint

```http
POST /auth/register
```

### Request

```json
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "Nguyen Van A"
}
```

### Response

```json
{
  "success": true,
  "message": "User created"
}
```

---

## Đăng nhập

### Endpoint

```http
POST /auth/login
```

### Request

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Response

```json
{
  "access_token": "...",
  "token_type": "bearer"
}
```

---

## Thông tin người dùng

### Endpoint

```http
GET /auth/me
```

### Response

```json
{
  "id": "...",
  "email": "user@example.com",
  "full_name": "Nguyen Van A"
}
```

---

# 4. AOI APIs

## Tạo AOI

### Endpoint

```http
POST /aois
```

### Request

```json
{
  "name": "Noi Bai Airport",
  "description": "Airport Monitoring",
  "geometry": {
    "type": "Polygon",
    "coordinates": [...]
  }
}
```

### Response

```json
{
  "id": "uuid",
  "name": "Noi Bai Airport"
}
```

---

## Danh sách AOI

### Endpoint

```http
GET /aois
```

### Query Parameters

```http
?page=1
&limit=20
```

### Response

```json
{
  "items": [],
  "total": 50
}
```

---

## Chi tiết AOI

### Endpoint

```http
GET /aois/{aoi_id}
```

---

## Cập nhật AOI

### Endpoint

```http
PUT /aois/{aoi_id}
```

---

## Xóa AOI

### Endpoint

```http
DELETE /aois/{aoi_id}
```

---

# 5. STAC APIs

## Danh sách Collection

### Endpoint

```http
GET /stac/collections
```

### Response

```json
{
  "collections": [
    {
      "id": "sentinel-2",
      "title": "Sentinel-2 Collection"
    }
  ]
}
```

---

## Chi tiết Collection

### Endpoint

```http
GET /stac/collections/{collection_id}
```

---

## Search Images

### Endpoint

```http
POST /stac/search
```

### Request

```json
{
  "collections": [
    "sentinel-2"
  ],
  "bbox": [
    105.7,
    20.9,
    106.0,
    21.3
  ],
  "datetime": "2026-01-01/2026-12-31",
  "limit": 20
}
```

### Response

```json
{
  "features": []
}
```

---

## Search by AOI

### Endpoint

```http
POST /stac/search/aoi
```

### Request

```json
{
  "aoi_id": "uuid",
  "start_date": "2026-01-01",
  "end_date": "2026-12-31"
}
```

---

# 6. Tile APIs

## Tile Endpoint

### Endpoint

```http
GET /tiles/{collection}/{z}/{x}/{y}
```

### Example

```http
GET /tiles/sentinel-2/12/3321/1520
```

### Response

```text
PNG Tile
```

---

## Tile Metadata

### Endpoint

```http
GET /tiles/{collection}/metadata
```

---

# 7. Search APIs

## Geocoding

### Endpoint

```http
GET /search/location
```

### Query

```http
?q=Ha Noi
```

### Response

```json
[
  {
    "name": "Ha Noi",
    "lat": 21.0285,
    "lng": 105.8542
  }
]
```

---

## Reverse Geocoding

### Endpoint

```http
GET /search/reverse
```

### Query

```http
?lat=21.0285
&lng=105.8542
```

---

# 8. Measurement APIs

## Calculate Area

### Endpoint

```http
POST /measure/area
```

### Request

```json
{
  "geometry": {}
}
```

### Response

```json
{
  "area": 123456.78,
  "unit": "m2"
}
```

---

## Calculate Distance

### Endpoint

```http
POST /measure/distance
```

### Response

```json
{
  "distance": 5.2,
  "unit": "km"
}
```

---

# 9. Temporal Comparison APIs

## Compare Images

### Endpoint

```http
POST /compare
```

### Request

```json
{
  "collection": "sentinel-2",
  "aoi_id": "uuid",
  "date_1": "2025-01-01",
  "date_2": "2026-01-01"
}
```

### Response

```json
{
  "image_1": "...",
  "image_2": "..."
}
```

---

# 10. Job APIs

## Tạo Job

### Endpoint

```http
POST /jobs
```

### Request

```json
{
  "job_type": "object_detection",
  "aoi_id": "uuid"
}
```

### Response

```json
{
  "job_id": "uuid",
  "status": "pending"
}
```

---

## Danh sách Jobs

### Endpoint

```http
GET /jobs
```

---

## Chi tiết Job

### Endpoint

```http
GET /jobs/{job_id}
```

### Response

```json
{
  "id": "uuid",
  "status": "running",
  "progress": 60
}
```

---

## Hủy Job

### Endpoint

```http
DELETE /jobs/{job_id}
```

---

# 11. Detection APIs

## Chạy Detection

### Endpoint

```http
POST /detections
```

### Request

```json
{
  "aoi_id": "uuid",
  "collection": "sentinel-2"
}
```

### Response

```json
{
  "job_id": "uuid"
}
```

---

## Kết quả Detection

### Endpoint

```http
GET /detections/{job_id}
```

### Response

```json
{
  "objects": [
    {
      "class": "vehicle",
      "confidence": 0.95,
      "bbox": [120,130,170,180]
    }
  ]
}
```

---

# 12. Statistics APIs

## Dashboard Statistics

### Endpoint

```http
GET /statistics
```

### Response

```json
{
  "total_users": 100,
  "total_aois": 500,
  "total_jobs": 2000
}
```

---

# 13. WebSocket APIs

## Endpoint

```text
ws://localhost:8000/ws/jobs
```

---

## Job Started Event

### Server Message

```json
{
  "event": "job_started",
  "job_id": "uuid"
}
```

---

## Job Progress Event

### Server Message

```json
{
  "event": "job_progress",
  "job_id": "uuid",
  "progress": 50
}
```

---

## Job Completed Event

### Server Message

```json
{
  "event": "job_completed",
  "job_id": "uuid"
}
```

---

## Job Failed Event

### Server Message

```json
{
  "event": "job_failed",
  "job_id": "uuid",
  "error": "Error details"
}
```

---

## Detection Completed Event

### Server Message

```json
{
  "event": "detection_completed",
  "job_id": "uuid"
}
```

---

# 14. Pagination Convention

## Request

```http
?page=1
&limit=20
```

---

## Response

```json
{
  "page": 1,
  "limit": 20,
  "total": 150,
  "items": []
}
```

---

# 15. Filtering Convention

## Example

```http
GET /jobs
?status=completed
&job_type=object_detection
```

---

# 16. Security

## Authentication

Sử dụng:

```text
JWT Bearer Token
```

---

## Authorization Header

```http
Authorization: Bearer <token>
```

---

## Rate Limiting

Đề xuất:

```text
100 requests / minute
```

cho mỗi người dùng.

---

# 17. API Versioning

Tất cả endpoint sử dụng version:

```text
/api/v1
```

Ví dụ:

```http
/api/v1/aois

/api/v1/jobs

/api/v1/stac/search
```

---

# 18. OpenAPI Documentation

FastAPI tự động sinh:

```text
/swagger

/redoc
```

---

# 19. Kết luận

Bộ API được thiết kế theo hướng:

* RESTful
* Dễ mở rộng
* Hỗ trợ GIS
* Hỗ trợ STAC
* Hỗ trợ xử lý bất đồng bộ
* Hỗ trợ AI Detection
* Hỗ trợ Realtime Communication

Đồng thời đảm bảo tính tương thích với frontend React và hệ sinh thái STAC hiện đại.
