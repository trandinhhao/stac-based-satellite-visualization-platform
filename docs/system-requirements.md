# Yêu cầu hệ thống

## 1. Phạm vi

Tài liệu này mô tả yêu cầu để chạy, phát triển và mở rộng STAC-Based Satellite
Visualization Platform. Yêu cầu được chia thành local demo, development và
production khuyến nghị.

## 2. Local demo bằng Docker Compose

Yêu cầu tối thiểu:

- Docker Desktop hoặc Docker Engine.
- Docker Compose v2.
- Git.
- 8 GB RAM.
- 4 CPU cores.
- 10 GB disk trống.

Khuyến nghị:

- 16 GB RAM.
- SSD.
- Kết nối internet ổn định.
- GPU nếu chạy AI model nặng.

## 3. Development frontend

Nếu chạy frontend ngoài Docker:

- Node.js 20+.
- npm.
- Trình duyệt hiện đại hỗ trợ WebGL.

Lệnh chính:

```bash
cd frontend
npm install
npm run dev
```

Trình duyệt nên hỗ trợ:

- WebGL.
- WebSocket.
- ES modules.
- Canvas rendering tốt.

## 4. Development backend

Nếu chạy backend ngoài Docker:

- Python 3.10+.
- pip.
- Virtual environment.
- PostgreSQL/PostGIS hoặc container `postgis`.
- Redis.
- RabbitMQ.

Lệnh chính:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Chạy worker:

```bash
celery -A workers.celery_app worker --loglevel=info
```

## 5. Biến môi trường bắt buộc

Nhóm database:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`

Nhóm STAC FastAPI:

- `PGHOST`
- `PGPORT`
- `PGUSER`
- `PGPASSWORD`
- `PGDATABASE`

Nhóm cache/queue:

- `REDIS_URL`
- `RABBITMQ_URL`

Nhóm service port:

- `BACKEND_PORT`
- `FRONTEND_PORT`
- `APP_PORT`
- `TITILER_PORT`
- `REDIS_PORT`
- `RABBITMQ_PORT`
- `RABBITMQ_MANAGEMENT_PORT`

Nhóm API key:

- `PLANET_API_KEY`
- `VITE_MAPBOX_ACCESS_TOKEN`

## 6. Yêu cầu database

Database cần hỗ trợ:

- PostgreSQL.
- PostGIS.
- PgSTAC.
- Extension/function cho UUID nếu dùng `gen_random_uuid()`.

Trong compose, image PgSTAC đã cung cấp phần lớn yêu cầu này. Migration của
ứng dụng cần được chạy để tạo bảng nghiệp vụ.

## 7. Yêu cầu network

Các service trong Docker Compose dùng network:

```text
satellite-network
```

Frontend dev server proxy tới:

- `backend:8000`
- `stac-fastapi:8080`
- `titiler:8002`

Nếu chạy ngoài Docker, cần đổi proxy target hoặc dùng reverse proxy host.

## 8. Yêu cầu AI

Pipeline AI có thể chạy ở nhiều mức:

### Demo/fallback

- Không cần model `.pt`.
- Không cần GPU.
- Nếu inference lỗi, hệ thống tạo mock detection.

### Inference CPU

- Cần cài `ultralytics`, `pillow`, `opencv-python-headless`.
- Chạy được nhưng chậm với ảnh lớn.
- Phù hợp thử nghiệm nhỏ.

### Inference GPU

- Cần image/container hỗ trợ CUDA.
- Cần PyTorch CUDA.
- Cần GPU NVIDIA và driver tương thích.
- Nên tách worker AI riêng.

## 9. Yêu cầu trình duyệt

Khuyến nghị:

- Chrome/Edge/Firefox bản mới.
- Bật hardware acceleration.
- Màn hình tối thiểu 1366x768.

Với màn hình nhỏ/mobile, giao diện vẫn có thể hiển thị nhưng trải nghiệm GIS
phù hợp hơn trên desktop/tablet.

## 10. Yêu cầu production khuyến nghị

Hạ tầng:

- Reverse proxy HTTPS.
- PostgreSQL/PostGIS managed hoặc cluster.
- Redis persistent/managed.
- RabbitMQ persistent/managed.
- Backend replicas.
- Worker pool.
- Object storage cho model và dữ liệu ảnh.

Bảo mật:

- Authentication.
- Authorization.
- CORS giới hạn.
- Rate limiting.
- Secret manager.
- Audit logging.

Vận hành:

- Health check.
- Metrics.
- Structured logs.
- Backup database.
- Migration pipeline.
- Alerting cho worker failure.

