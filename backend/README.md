# Backend README

Backend là lớp API và điều phối nghiệp vụ của STAC-Based Satellite Visualization
Platform. Thành phần này được xây dựng bằng FastAPI, SQLAlchemy, Alembic,
Redis, RabbitMQ và Celery. Backend vừa cung cấp REST API cho frontend, vừa giữ
WebSocket server để đẩy tiến trình xử lý job theo thời gian thực.

## 1. Vai trò

Backend chịu trách nhiệm cho các nhóm chức năng chính:

- Health check cho API, PostgreSQL, Redis và RabbitMQ.
- Quản lý AOI: tạo, đọc, cập nhật, xóa, import/export GeoJSON.
- Tính toán đo đạc không gian bằng PostGIS.
- Tìm kiếm STAC collection/item và cache kết quả.
- Proxy Planet tile/thumbnail để giấu API key khỏi frontend.
- Quản lý job nền.
- Tạo task Celery cho AI detection.
- Nhận tiến trình từ Redis Pub/Sub và broadcast qua WebSocket.

## 2. Cấu trúc thư mục

```text
backend/
├── api/
│   ├── aois.py          # AOI CRUD, import/export GeoJSON
│   ├── detections.py    # Tạo detection job và đọc kết quả detection
│   ├── jobs.py          # Job CRUD/list/cancel
│   ├── measure.py       # Đo khoảng cách/diện tích/chu vi bằng PostGIS
│   ├── stac.py          # STAC search, collection, Planet proxy
│   └── websocket.py     # WebSocket /ws/jobs
├── db/
│   └── database.py      # SQLAlchemy engine, SessionLocal, Base
├── models/
│   ├── aoi.py           # Bảng aois
│   ├── detection.py     # Bảng detections
│   └── job.py           # Bảng jobs
├── schemas/
│   └── aoi.py           # Pydantic schemas cho AOI
├── services/
│   ├── ai/
│   │   ├── detector.py  # Pipeline YOLO detection
│   │   └── training/    # Nơi đặt model weights .pt
│   ├── stac/            # STAC client/search/collections
│   └── redis_cache.py   # Redis cache helper
├── workers/
│   ├── celery_app.py    # Celery configuration
│   └── tasks.py         # Background tasks
├── alembic/             # Database migrations
├── alembic.ini
├── Dockerfile
├── main.py
└── requirements.txt
```

## 3. FastAPI entrypoint

Entrypoint nằm ở `main.py`. File này:

- Khởi tạo app FastAPI với title `STAC Satellite Platform Backend API`.
- Gắn router dưới prefix `/api/v1`.
- Gắn WebSocket router không dùng prefix REST.
- Định nghĩa health endpoints.
- Tạo background task `redis_pubsub_listener()` trong lifespan.

Router hiện tại:

```python
app.include_router(stac_router, prefix="/api/v1")
app.include_router(aois_router, prefix="/api/v1")
app.include_router(measure_router, prefix="/api/v1")
app.include_router(jobs_router, prefix="/api/v1")
app.include_router(detections_router, prefix="/api/v1")
app.include_router(ws_router, prefix="")
```

## 4. API nhóm AOI

File: `api/aois.py`

Endpoints:

- `POST /api/v1/aois`
- `GET /api/v1/aois`
- `GET /api/v1/aois/{aoi_id}`
- `PUT /api/v1/aois/{aoi_id}`
- `DELETE /api/v1/aois/{aoi_id}`
- `GET /api/v1/aois/{aoi_id}/export`
- `POST /api/v1/aois/import`

AOI chỉ chấp nhận GeoJSON `Polygon`. Khi tạo/cập nhật AOI, backend dùng
PostGIS:

- `ST_GeomFromGeoJSON`
- `ST_SetSRID(..., 4326)`
- `ST_Area(...::geography)`
- `ST_Perimeter(...::geography)`
- `ST_AsGeoJSON`

Khi xóa AOI, backend cũng xóa các job và detection liên quan để tránh dữ liệu
mồ côi.

## 5. API đo đạc

File: `api/measure.py`

Endpoint:

```text
POST /api/v1/measure
```

Payload:

```json
{
  "geometry": {
    "type": "LineString",
    "coordinates": [[105.8, 21.0], [105.9, 21.1]]
  }
}
```

Hoặc:

```json
{
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[105.8, 21.0], [105.9, 21.0], [105.9, 21.1], [105.8, 21.0]]]
  }
}
```

Kết quả:

- LineString trả về `type=distance`, `distance`, `unit=m`.
- Polygon trả về `type=area`, `area`, `perimeter`, `unit_area=m2`,
  `unit_perimeter=m`.

## 6. API STAC và Planet proxy

File: `api/stac.py`

Endpoints:

- `GET /api/v1/stac/collections`
- `POST /api/v1/stac/search`
- `GET /api/v1/stac/planet/tiles/{mosaic_name}/{z}/{x}/{y}.png`
- `GET /api/v1/stac/planet/tiles/PSScene/{scene_id}/{z}/{x}/{y}.png`
- `GET /api/v1/stac/planet/thumbnail/{scene_id}`

`/stac/search` hỗ trợ:

- `collections`
- `datetime`
- `bbox`
- `intersects`
- `limit`

Backend normalize ngày dạng `YYYY-MM-DD` thành khoảng ngày đầy đủ theo ISO UTC.
Kết quả search được cache trong Redis 5 phút. Danh sách collection được cache
1 giờ.

Planet proxy yêu cầu biến môi trường:

```text
PLANET_API_KEY
```

Nếu key chưa được cấu hình, API sẽ trả lỗi 500 với thông báo rõ ràng.

## 7. API jobs

File: `api/jobs.py`

Endpoints:

- `POST /api/v1/jobs`
- `GET /api/v1/jobs`
- `GET /api/v1/jobs/{job_id}`
- `DELETE /api/v1/jobs/{job_id}`

Job type hợp lệ theo code hiện tại:

- `object_detection`
- `aoi_extraction` và `comparison` được validate là hợp lệ nhưng chưa có worker
  xử lý nền thực tế; nếu tạo sẽ bị chuyển thành failed khi queue task.

Với `object_detection`, backend:

1. Tạo UUID job.
2. Ghi vào bảng `jobs` với status `queued`.
3. Gọi `process_detection_task.apply_async(...)` và dùng `job_id` làm
   `task_id`.
4. Trả về `job_id`.

Cancel job dùng `celery_app.control.revoke(job_id, terminate=True)` rồi cập
nhật status thành `cancelled`.

## 8. API detections

File: `api/detections.py`

Endpoints:

- `POST /api/v1/detections`
- `GET /api/v1/detections/{job_id}`

`POST /detections` là lối tắt để tạo job `object_detection` từ một `aoi_id`.
Khi job hoàn thành, `GET /detections/{job_id}` trả danh sách object:

```json
{
  "job_id": "uuid",
  "objects": [
    {
      "object_class": "vehicle",
      "confidence": 0.91,
      "bbox": [105.8, 21.0, 105.81, 21.01]
    }
  ]
}
```

Nếu job chưa `completed`, API trả lỗi 400 để frontend biết kết quả chưa sẵn sàng.

## 9. Realtime WebSocket

File: `api/websocket.py`

Endpoint:

```text
WS /ws/jobs
```

Client có thể gửi text `ping`, server trả `pong`. Các event job được backend
broadcast dưới dạng JSON.

Event mẫu:

```json
{
  "event": "job_progress",
  "job_id": "uuid",
  "progress": 50,
  "status": "running",
  "job_type": "object_detection"
}
```

FastAPI không trực tiếp xử lý task nặng. Nó chỉ lắng nghe Redis Pub/Sub channel
`job_updates`, sau đó gửi event tới các WebSocket đang mở.

## 10. Celery worker

File cấu hình: `workers/celery_app.py`

Celery sử dụng:

- RabbitMQ làm broker.
- Redis làm result backend.

Task chính hiện tại: `process_detection_task()` trong `workers/tasks.py`.

Task này:

1. Cập nhật job sang `running`.
2. Lấy geometry AOI từ database.
3. Gọi `run_real_detection()`.
4. Lưu detections vào bảng `detections`.
5. Cập nhật job sang `completed`.
6. Publish event realtime qua Redis.

Nếu task lỗi, Celery retry tối đa 3 lần với backoff đơn giản. Sau lần cuối,
job chuyển sang `failed`.

## 11. Database

Backend dùng SQLAlchemy với connection string từ:

```text
DATABASE_URL
```

Mặc định:

```text
postgresql://postgres:postgres@postgis:5432/postgis
```

Trong `db/database.py`, engine thêm option:

```text
-csearch_path=pgstac,public
```

Điều này cho phép backend truy cập schema PgSTAC và public trong cùng database.

Các bảng nghiệp vụ:

- `aois`
- `jobs`
- `detections`

Migration bằng Alembic:

```bash
alembic upgrade head
```

Trong Docker:

```bash
docker compose exec backend alembic upgrade head
```

## 12. Chạy backend local

Nếu không dùng Docker:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend cần PostgreSQL/PostGIS, Redis và RabbitMQ đang chạy. Cách đơn giản nhất
là vẫn dùng Docker Compose cho hạ tầng, rồi chạy backend ngoài container khi
cần debug.

## 13. Chạy worker local

```bash
cd backend
celery -A workers.celery_app worker --loglevel=info
```

Đảm bảo các biến môi trường sau trỏ đúng:

```text
DATABASE_URL
REDIS_URL
RABBITMQ_URL
PLANET_API_KEY
PYTHONPATH
```

## 14. Lưu ý kỹ thuật

- API hiện chưa có authentication.
- Error response đang dùng mặc định của FastAPI hoặc `HTTPException`, chưa có
  envelope chuẩn thống nhất.
- Một số job type có trong schema nhưng worker thực tế mới xử lý
  `object_detection`.
- AI detection có fallback/mock để hệ thống vẫn demo được khi thiếu model hoặc
  thư viện ML.
- Production nên tách cấu hình Docker riêng, không dùng `uvicorn --reload`.

