# deployment-guide.md

# Hướng dẫn triển khai hệ thống

## 1. Mục tiêu

Tài liệu này hướng dẫn triển khai toàn bộ hệ thống:

* Frontend (React)
* Backend (FastAPI)
* PostgreSQL
* PgSTAC
* Redis
* RabbitMQ
* Celery Worker
* TiTiler
* STAC FastAPI

Mục tiêu:

* Dễ triển khai
* Dễ mở rộng
* Đồng nhất môi trường giữa các thành viên
* Hỗ trợ triển khai Production sau này

---

# 2. Kiến trúc triển khai

## Môi trường Development

```mermaid
flowchart TB

    Browser

    Browser --> Frontend

    Frontend --> Backend

    Backend --> PostgreSQL
    Backend --> Redis
    Backend --> RabbitMQ

    RabbitMQ --> Worker

    Backend --> STAC

    STAC --> PgSTAC

    Frontend --> TiTiler

    TiTiler --> PgSTAC
```

---

## Môi trường Production

```mermaid
flowchart TB

    User

    User --> Nginx

    Nginx --> Frontend

    Nginx --> Backend

    Backend --> PostgreSQL
    Backend --> Redis
    Backend --> RabbitMQ

    RabbitMQ --> Worker

    Backend --> STAC

    STAC --> PgSTAC

    Frontend --> TiTiler
```

---

# 3. Yêu cầu hệ thống

## Development

### Tối thiểu

| Thành phần | Yêu cầu |
| ---------- | ------- |
| CPU        | 4 Core  |
| RAM        | 8 GB    |
| Storage    | 20 GB   |

---

### Khuyến nghị

| Thành phần | Yêu cầu   |
| ---------- | --------- |
| CPU        | 8 Core    |
| RAM        | 16 GB     |
| Storage    | 50 GB SSD |

---

## Production

| Thành phần | Yêu cầu   |
| ---------- | --------- |
| CPU        | 8-16 Core |
| RAM        | 16-32 GB  |
| Storage    | SSD       |

---

# 4. Cài đặt Docker

## Ubuntu

```bash
sudo apt update

sudo apt install docker.io

sudo apt install docker-compose-plugin
```

---

## Kiểm tra

```bash
docker --version

docker compose version
```

---

# 5. Cấu trúc thư mục triển khai

```text
satellite-platform/

├── frontend/
├── backend/
├── worker/

├── docker/
│   ├── nginx/
│   ├── postgres/
│   └── redis/

├── docs/

├── .env

├── docker-compose.yml

└── README.md
```

---

# 6. Environment Variables

## File .env

```env
# Application

APP_NAME=SatellitePlatform

APP_ENV=development

APP_DEBUG=true

# Database

POSTGRES_DB=satellite_db

POSTGRES_USER=postgres

POSTGRES_PASSWORD=postgres

DATABASE_URL=postgresql://postgres:postgres@postgres:5432/satellite_db

# Redis

REDIS_HOST=redis

REDIS_PORT=6379

# RabbitMQ

RABBITMQ_HOST=rabbitmq

RABBITMQ_PORT=5672

RABBITMQ_USER=guest

RABBITMQ_PASSWORD=guest

# JWT

JWT_SECRET=super-secret-key

# Frontend

VITE_API_URL=http://localhost:8000/api/v1

# STAC

STAC_API_URL=http://stac-fastapi:8080

# TiTiler

TITILER_URL=http://titiler:8081
```

---

# 7. Docker Compose

## docker-compose.yml

```yaml
version: "3.9"

services:

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"

  backend:
    build: ./backend
    ports:
      - "8000:8000"

  postgres:
    image: postgis/postgis

  redis:
    image: redis:7

  rabbitmq:
    image: rabbitmq:3-management

  worker:
    build: ./backend

  titiler:
    image: developmentseed/titiler

  stac-fastapi:
    image: stac-utils/stac-fastapi
```

---

# 8. Khởi động hệ thống

## Build

```bash
docker compose build
```

---

## Run

```bash
docker compose up -d
```

---

## Kiểm tra

```bash
docker compose ps
```

---

# 9. Database Migration

## Alembic

Tạo migration

```bash
alembic revision --autogenerate
```

---

Áp dụng migration

```bash
alembic upgrade head
```

---

# 10. Seed Data

## Tạo dữ liệu mẫu

```bash
python scripts/seed.py
```

---

## Dữ liệu

* User mẫu
* AOI mẫu
* Job mẫu

---

# 11. Nạp dữ liệu STAC

## Sentinel Collection

Ví dụ:

```bash
python import_stac.py
```

---

Kết quả:

```text
Collection
Items
Assets
```

được lưu vào PgSTAC.

---

# 12. Frontend Deployment

## Development

```bash
npm install

npm run dev
```

---

## Production Build

```bash
npm install

npm run build
```

---

Kết quả:

```text
dist/
```

---

# 13. Backend Deployment

## Development

```bash
uvicorn app.main:app --reload
```

---

## Production

```bash
gunicorn \
-k uvicorn.workers.UvicornWorker \
-w 4 \
app.main:app
```

---

# 14. Celery Worker

## Khởi động Worker

```bash
celery \
-A app.worker.celery_app \
worker \
--loglevel=info
```

---

## Khởi động Beat (Optional)

```bash
celery beat
```

---

# 15. RabbitMQ Management

## Dashboard

```text
http://localhost:15672
```

---

Thông tin mặc định:

```text
user: guest

password: guest
```

---

# 16. Redis

## Kiểm tra kết nối

```bash
redis-cli ping
```

---

Kết quả:

```text
PONG
```

---

# 17. Reverse Proxy

## Nginx

### nginx.conf

```nginx
server {

    listen 80;

    server_name domain.com;

    location / {
        proxy_pass http://frontend:3000;
    }

    location /api {
        proxy_pass http://backend:8000;
    }

    location /ws {
        proxy_pass http://backend:8000;
    }
}
```

---

# 18. HTTPS

## Let's Encrypt

Cài đặt:

```bash
sudo apt install certbot
```

---

Sinh SSL

```bash
certbot --nginx
```

---

# 19. Monitoring

## Application Logs

```bash
docker compose logs -f
```

---

## Service Logs

```bash
docker logs container_id
```

---

# 20. Monitoring nâng cao (Optional)

## Prometheus

Thu thập:

* CPU
* Memory
* Request Count

---

## Grafana

Dashboard:

* API Metrics
* Database Metrics
* Queue Metrics

---

# 21. Backup

## PostgreSQL

### Backup

```bash
pg_dump \
-U postgres \
satellite_db \
> backup.sql
```

---

### Restore

```bash
psql \
-U postgres \
satellite_db \
< backup.sql
```

---

# 22. Disaster Recovery

## Backup hàng ngày

* Database
* Metadata

---

## Backup hàng tuần

* Full Snapshot

---

## Backup hàng tháng

* Archive Backup

---

# 23. CI/CD (Khuyến nghị)

## GitHub Actions

### Pipeline

```mermaid
flowchart LR

    Developer

    Developer --> GitHub

    GitHub --> Test

    Test --> Build

    Build --> Deploy
```

---

### Các bước

1. Lint
2. Unit Test
3. Build Docker Image
4. Push Registry
5. Deploy

---

# 24. Triển khai Production

## Server đề xuất

### Option 1

VPS

* Ubuntu 22.04
* Docker
* Nginx

---

### Option 2

Cloud

* AWS
* Azure
* GCP

---

### Option 3

Hạ tầng Viettel Cloud

* Kubernetes
* Load Balancer
* Object Storage

---

# 25. Checklist triển khai

## Development

* [ ] Docker cài đặt thành công
* [ ] PostgreSQL chạy
* [ ] Redis chạy
* [ ] RabbitMQ chạy
* [ ] Frontend chạy
* [ ] Backend chạy
* [ ] STAC chạy
* [ ] TiTiler chạy

---

## Production

* [ ] Domain
* [ ] SSL
* [ ] Backup
* [ ] Monitoring
* [ ] Logging
* [ ] Security

---

# 26. Kết luận

Kiến trúc triển khai được thiết kế theo hướng:

* Docker-first
* Cloud-ready
* Dễ mở rộng
* Dễ bảo trì

Cho phép nhóm phát triển nhanh trong giai đoạn Viettel Digital Talent đồng thời tạo nền tảng để mở rộng thành hệ thống WebGIS thực tế trong tương lai.
