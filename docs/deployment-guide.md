# Hướng dẫn triển khai

## 1. Mục tiêu

Tài liệu này hướng dẫn triển khai hệ thống trong môi trường local/demo bằng
Docker Compose. Đây là cách triển khai phù hợp với trạng thái hiện tại của
repo. Phần cuối tài liệu có khuyến nghị để chuyển sang production.

## 2. Yêu cầu

Phần mềm:

- Docker Desktop hoặc Docker Engine.
- Docker Compose v2.
- Git.

Tài nguyên khuyến nghị:

- CPU 4 cores trở lên.
- RAM 8 GB tối thiểu, 16 GB nếu chạy AI model thật.
- Disk trống 10 GB trở lên.
- Internet nếu cần pull image, gọi Planet API hoặc tải model.

## 3. Clone source

```bash
git clone https://github.com/trandinhhao/stac-based-satellite-visualization-platform.git
cd stac-based-satellite-visualization-platform
```

## 4. Cấu hình môi trường

Tạo `.env`:

```bash
cp .env.example .env
```

Các biến quan trọng:

```text
POSTGRES_DB=postgis
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_postgres_password_here
PGHOST=postgis
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_postgres_password_here
PGDATABASE=postgis
DATABASE_URL=postgresql://postgres:your_postgres_password_here@postgis:5432/postgis
REDIS_URL=redis://redis:6379/0
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672//
PLANET_API_KEY=your_planet_api_key_here
```

Nếu không dùng Planet API, có thể để placeholder. Các endpoint Planet sẽ báo
lỗi cấu hình khi được gọi, nhưng phần AOI/measurement/job demo vẫn có thể hoạt
động.

## 5. Khởi động service

```bash
docker compose up -d --build
```

Lệnh này sẽ:

- Build image backend.
- Build image frontend.
- Tạo container worker từ image backend.
- Pull image PostGIS/PgSTAC, STAC FastAPI, TiTiler, Redis, RabbitMQ.
- Tạo network `satellite-network`.
- Tạo volume `postgres-data` và `redis-data`.

## 6. Chạy migration

Sau khi `postgis` healthy và backend chạy, chạy:

```bash
docker compose exec backend alembic upgrade head
```

Nếu bỏ qua bước này trên database mới, các API như `/api/v1/aois`,
`/api/v1/jobs` có thể lỗi vì chưa có bảng.

## 7. Kiểm tra container

```bash
docker compose ps
```

Các service mong đợi:

- `postgis`
- `stac-fastapi`
- `titiler`
- `redis`
- `rabbitmq`
- `backend`
- `worker`
- `frontend`

## 8. Kiểm tra endpoint

Frontend:

```text
http://localhost:3000
```

Backend:

```text
http://localhost:8000/docs
http://localhost:8000/health
http://localhost:8000/health/db
http://localhost:8000/health/redis
http://localhost:8000/health/rabbitmq
```

STAC FastAPI:

```text
http://localhost:8080/docs
```

TiTiler:

```text
http://localhost:8002/healthz
```

RabbitMQ Management:

```text
http://localhost:15672
```

Tài khoản mặc định:

```text
guest / guest
```

## 9. Xem log

Backend:

```bash
docker compose logs -f backend
```

Worker:

```bash
docker compose logs -f worker
```

Frontend:

```bash
docker compose logs -f frontend
```

PostGIS:

```bash
docker compose logs -f postgis
```

## 10. Workflow kiểm thử nhanh

1. Mở `http://localhost:3000`.
2. Mở tab AOI.
3. Vẽ một polygon nhỏ.
4. Lưu AOI.
5. Kiểm tra AOI xuất hiện trên bản đồ.
6. Mở tab AI.
7. Chọn AOI.
8. Tạo job detection.
9. Quan sát FloatingJobsWidget và notification.
10. Khi job completed, xem bounding box trên bản đồ.

Nếu AI model không có, hệ thống có thể trả mock detection để luồng demo vẫn
hoàn thành.

## 11. Dừng hệ thống

Dừng container:

```bash
docker compose down
```

Dừng và xóa dữ liệu:

```bash
docker compose down -v
```

## 12. Reset môi trường

Để reset sạch database:

```bash
docker compose down -v
docker compose up -d --build
docker compose exec backend alembic upgrade head
```

Lưu ý: lệnh `down -v` xóa toàn bộ volume PostgreSQL và Redis.

## 13. Chạy từng phần khi phát triển

Có thể chạy hạ tầng bằng Docker, còn frontend/backend chạy ngoài host để debug.

Ví dụ chạy hạ tầng:

```bash
docker compose up -d postgis redis rabbitmq stac-fastapi titiler
```

Chạy backend local:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Chạy worker local:

```bash
cd backend
celery -A workers.celery_app worker --loglevel=info
```

Chạy frontend local:

```bash
cd frontend
npm install
npm run dev
```

Cần điều chỉnh host trong env/proxy nếu chạy ngoài Docker network.

## 14. Lưu ý production

Compose hiện tại là cấu hình development:

- Backend chạy `uvicorn --reload`.
- Frontend chạy Vite dev server.
- Source code được mount vào container.
- Secrets nằm trong `.env`.
- Chưa có authentication.
- Chưa có reverse proxy production.

Production nên:

- Build frontend static và serve bằng Nginx/Caddy.
- Chạy backend bằng Uvicorn/Gunicorn không reload.
- Tự động chạy migration trong CI/CD.
- Dùng secret manager.
- Bật HTTPS.
- Thêm authentication/authorization.
- Giới hạn CORS và allowed hosts.
- Cấu hình logging/monitoring.
- Tách worker pool riêng cho AI.
- Dùng persistent object storage cho dữ liệu/model.

