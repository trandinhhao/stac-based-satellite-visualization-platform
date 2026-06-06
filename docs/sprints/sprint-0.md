# Sprint 0 - Foundation & Infrastructure

## Thông tin Sprint

**Mục tiêu:** Hoàn thiện toàn bộ hạ tầng nền tảng và môi trường phát triển để các Sprint tiếp theo chỉ tập trung vào business logic.

**Thời lượng:** 1 tuần

**Kết quả mong đợi:**

Sau khi chạy:

```bash
docker compose up -d
```

Toàn bộ hệ thống hoạt động:

* Frontend (React)
* Backend (FastAPI)
* PostgreSQL + PostGIS
* Redis
* RabbitMQ
* PgSTAC
* STAC FastAPI
* TiTiler

---

# Task 0.0 - Proof Of Concept (Ưu tiên cao nhất)

## Mục tiêu

Xác nhận stack GIS hoạt động trước khi đầu tư thời gian vào việc xây dựng toàn bộ hệ thống và code business logic.

### Checklist

* [x] PostgreSQL + PostGIS chạy
* [x] PgSTAC chạy
* [x] STAC FastAPI chạy
* [x] TiTiler chạy
* [x] Query được dữ liệu STAC

### Test

```http
GET /collections
```

### Deliverable

* [ ] STAC Stack hoạt động hoàn chỉnh

---

# Epic 1 - Repository Setup

## Task 1.1 - Tạo Repository

### Checklist

* [x] Tạo Git Repository
* [x] Tạo README.md
* [x] Tạo .gitignore
* [x] Tạo .env.example

### Cấu trúc thư mục

```text
satellite-platform/
│
├── frontend/
├── backend/
├── infra/
├── docs/
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## Task 1.2 - Branch Strategy

### Checklist

* [x] Tạo branch main
* [x] Tạo branch develop
* [x] Thiết lập quy trình Git Flow

### Naming Convention

```text
feature/frontend-init
feature/backend-init
feature/stac-init
feature/docker-setup
```

---

## Task 1.3 - Commit Convention

### Checklist

* [x] Thống nhất commit message

```text
feat:
fix:
docs:
refactor:
chore:
test:
```

---

# Epic 2 - Frontend Bootstrap

## Task 2.1 - Khởi tạo React Project

### Checklist

* [ ] Tạo project bằng Vite
* [ ] Sử dụng React + TypeScript

```bash
npm create vite@latest frontend
```

---

## Task 2.2 - Cài đặt thư viện cơ bản

### Checklist

* [ ] React Router
* [ ] Axios
* [ ] Zustand
* [ ] TanStack Query
* [ ] TailwindCSS
* [ ] Material UI
* [ ] Lucide Icons

```bash
npm install react-router-dom
npm install axios
npm install zustand
npm install @tanstack/react-query
npm install @mui/material
npm install lucide-react
```

---

## Task 2.3 - Tích hợp MapLibre

### Checklist

* [ ] Cài đặt MapLibre
* [ ] Render bản đồ đầu tiên

```bash
npm install maplibre-gl
```

---

## Task 2.4 - Thiết kế cấu trúc Frontend

### Checklist

* [ ] Tạo cấu trúc thư mục chuẩn

```text
src/
│
├── components/
├── pages/
├── layouts/
├── hooks/
├── services/
├── store/
├── types/
└── features/
```

---

## Deliverable

* [ ] `npm run dev` chạy thành công

---

# Epic 3 - Backend Bootstrap

## Task 3.1 - Khởi tạo FastAPI

### Checklist

* [ ] Tạo project backend
* [ ] Thiết lập virtual environment

```bash
python -m venv .venv
```

---

## Task 3.2 - Cài đặt package

### Checklist

* [ ] FastAPI
* [ ] Uvicorn
* [ ] SQLAlchemy
* [ ] Alembic
* [ ] Pydantic Settings
* [ ] Redis Client
* [ ] Celery
* [ ] RabbitMQ Client

```bash
pip install fastapi
pip install uvicorn
pip install sqlalchemy
pip install alembic
pip install psycopg2-binary
pip install pydantic-settings
pip install redis
pip install celery
pip install aio-pika
```

---

## Task 3.3 - Thiết kế cấu trúc Backend

### Checklist

* [ ] Tạo App Structure

```text
app/
│
├── api/
├── core/
├── db/
├── models/
├── schemas/
├── services/
└── workers/
```

---

## Task 3.4 - Health Endpoint

### Checklist

* [ ] Tạo API Health Check

```http
GET /health
```

Expected Response:

```json
{
  "status": "ok"
}
```

---

## Deliverable

* [ ] Swagger hoạt động tại `/docs`
* [ ] Health API hoạt động

---

# Epic 4 - PostgreSQL + PostGIS

## Task 4.1 - Docker PostgreSQL

### Checklist

* [ ] Tạo PostgreSQL Container
* [ ] Sử dụng PostGIS Image

```text
postgis/postgis
```

---

## Task 4.2 - Database Initialization

### Checklist

* [ ] Tạo database satellite_db
* [ ] Thiết lập user/password

---

## Task 4.3 - Kiểm tra PostGIS

### Checklist

* [ ] Kết nối database
* [ ] Verify PostGIS

```sql
SELECT PostGIS_Version();
```

---

## Deliverable

* [ ] PostgreSQL hoạt động
* [ ] PostGIS hoạt động

---

# Epic 5 - Redis

## Task 5.1 - Redis Container

### Checklist

* [ ] Deploy Redis

```text
redis:7
```

---

## Task 5.2 - Redis Connectivity

### Checklist

* [ ] Backend kết nối Redis

```python
redis.ping()
```

---

## Deliverable

* [ ] Redis hoạt động

---

# Epic 6 - RabbitMQ

## Task 6.1 - RabbitMQ Container

### Checklist

* [ ] Deploy RabbitMQ

```text
rabbitmq:3-management
```

---

## Task 6.2 - RabbitMQ Dashboard

### Checklist

* [ ] Truy cập Management UI

```text
http://localhost:15672
```

---

## Deliverable

* [ ] RabbitMQ hoạt động

---

# Epic 7 - STAC Stack

## Task 7.1 - Nghiên cứu STAC

### Checklist

* [ ] Hiểu Catalog
* [ ] Hiểu Collection
* [ ] Hiểu Item
* [ ] Hiểu Asset

---

## Task 7.2 - Deploy PgSTAC

### Checklist

* [ ] Tạo PgSTAC Container
* [ ] Kết nối PostgreSQL

---

## Task 7.3 - Deploy STAC FastAPI

### Checklist

* [ ] Deploy STAC API
* [ ] Kết nối PgSTAC

---

## Task 7.4 - Test STAC API

### Checklist

* [ ] Test endpoint collections

```http
GET /collections
```

---

## Deliverable

* [ ] STAC API hoạt động

---

# Epic 8 - TiTiler

## Task 8.1 - Deploy TiTiler

### Checklist

* [ ] Tạo TiTiler Container

```text
developmentseed/titiler
```

---

## Task 8.2 - Test Endpoint

### Checklist

* [ ] Kiểm tra Health Endpoint

```http
GET /healthz
```

---

## Deliverable

* [ ] TiTiler hoạt động

---

# Epic 9 - Docker Compose

## Task 9.1 - Compose Configuration

### Checklist

* [ ] Frontend Service
* [ ] Backend Service
* [ ] PostgreSQL Service
* [ ] Redis Service
* [ ] RabbitMQ Service
* [ ] PgSTAC Service
* [ ] STAC FastAPI Service
* [ ] TiTiler Service

---

## Task 9.2 - Docker Network

### Checklist

* [ ] Tạo network chung

```text
satellite-network
```

---

## Task 9.3 - Docker Volumes

### Checklist

* [ ] postgres-data
* [ ] redis-data

---

## Deliverable

* [ ] `docker compose up -d` chạy thành công

---

# Epic 10 - Health Checks

## Task 10.1

### Checklist

* [ ] Backend Health

```http
GET /health
```

---

## Task 10.2

### Checklist

* [ ] Database Health

```http
GET /health/db
```

---

## Task 10.3

### Checklist

* [ ] Redis Health

```http
GET /health/redis
```

---

## Task 10.4

### Checklist

* [ ] RabbitMQ Health

```http
GET /health/rabbitmq
```

---

## Deliverable

* [ ] Tất cả health check pass

---

# Epic 11 - Documentation

## Task 11.1 - README

### Checklist

* [ ] Project Overview
* [ ] Tech Stack
* [ ] Setup Guide
* [ ] Run Guide

---

## Task 11.2 - Environment Variables

### Checklist

* [ ] Tạo .env.example

---

## Task 11.3 - Architecture Diagram

### Checklist

* [ ] Sơ đồ tổng thể hệ thống

---

# Sprint 0 Definition Of Done

## Infrastructure

* [ ] Frontend chạy được
* [ ] Backend chạy được
* [ ] PostgreSQL chạy được
* [ ] PostGIS chạy được
* [ ] Redis chạy được
* [ ] RabbitMQ chạy được

## GIS Stack

* [ ] PgSTAC chạy được
* [ ] STAC FastAPI chạy được
* [ ] TiTiler chạy được

## Deployment

* [ ] Docker Compose chạy thành công
* [ ] Toàn bộ service cùng network

## API

* [ ] Swagger hoạt động
* [ ] Health Checks hoạt động

## Documentation

* [ ] README hoàn chỉnh
* [ ] .env.example hoàn chỉnh

---

# Sprint 0 Success Criteria

Sprint 0 được xem là hoàn thành khi:

```bash
docker compose up -d
```

khởi động thành công toàn bộ hệ thống và người phát triển mới có thể clone repository, cấu hình `.env`, chạy một lệnh duy nhất và sử dụng được toàn bộ môi trường phát triển.
