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

# Task 0.0 - Spike: Thử nghiệm nhanh GIS Stack (Proof Of Concept)

## Mục tiêu

Xác nhận khả năng chạy và liên thông độc lập của các service GIS (Postgres/PgSTAC, stac-fastapi, TiTiler) ở môi trường cô lập trước khi tích hợp chính thức vào hệ thống Docker Compose và codebase của dự án.

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

* [x] STAC Stack hoạt động hoàn chỉnh

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

* [x] Tạo project bằng Vite
* [x] Sử dụng React + TypeScript

```bash
npm create vite@latest frontend
```

---

## Task 2.2 - Cài đặt thư viện cơ bản

### Checklist

* [x] React Router
* [x] Axios
* [x] Zustand
* [x] TanStack Query
* [x] TailwindCSS
* [x] Material UI
* [x] Lucide Icons

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

* [x] Cài đặt MapLibre
* [x] Render bản đồ đầu tiên

```bash
npm install maplibre-gl
```

---

## Task 2.4 - Thiết kế cấu trúc Frontend

### Checklist

* [x] Tạo cấu trúc thư mục chuẩn

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

* [x] `npm run dev` chạy thành công

---

# Epic 3 - Backend Bootstrap

## Task 3.1 - Khởi tạo FastAPI

### Checklist

* [x] Tạo project backend
* [x] Thiết lập virtual environment

```bash
python -m venv .venv
```

---

## Task 3.2 - Cài đặt package

### Checklist

* [x] FastAPI
* [x] Uvicorn
* [x] SQLAlchemy
* [x] Alembic
* [x] Pydantic Settings
* [x] Redis Client
* [x] Celery
* [x] RabbitMQ Client

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

* [x] Tạo App Structure

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

* [x] Tạo API Health Check

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

* [x] Swagger hoạt động tại `/docs`
* [x] Health API hoạt động

---

# Epic 4 - PostgreSQL + PostGIS (Cấu hình & Khởi tạo CSDL Dự án)

> **Mục tiêu:** Thiết lập cấu hình CSDL chính thức của dự án, bao gồm cấu hình volume persistent `postgres-data`, khai báo database `postgis` chứa cả schema nghiệp vụ `public` và schema `pgstac`, và phân quyền kết nối an toàn cho Backend.

## Task 4.1 - Docker PostgreSQL

### Checklist

* [x] Tạo PostGIS Container (service name `postgis`)
* [x] Sử dụng PgSTAC Image (chứa sẵn PostgreSQL + PostGIS + PgSTAC)

```text
ghcr.io/stac-utils/pgstac:latest
```

---

## Task 4.2 - Database Initialization

### Checklist

* [x] Tạo database `postgis`
* [x] Thiết lập user/password (`postgres` / `postgres`)

---

## Task 4.3 - Kiểm tra PostGIS

### Checklist

* [x] Kết nối database
* [x] Verify PostGIS

```sql
SELECT PostGIS_Version();
```

---

## Deliverable

* [x] PostgreSQL hoạt động
* [x] PostGIS hoạt động

---

# Epic 5 - Redis

## Task 5.1 - Redis Container

### Checklist

* [x] Deploy Redis

```text
redis:7
```

---

## Task 5.2 - Redis Connectivity

### Checklist

* [x] Backend kết nối Redis

```python
redis.ping()
```

---

## Deliverable

* [x] Redis hoạt động

---

# Epic 6 - RabbitMQ

## Task 6.1 - RabbitMQ Container

### Checklist

* [x] Deploy RabbitMQ

```text
rabbitmq:3-management
```

---

## Task 6.2 - RabbitMQ Dashboard

### Checklist

* [x] Truy cập Management UI

```text
http://localhost:15672
```

---

## Deliverable

* [x] RabbitMQ hoạt động

---

# Epic 7 - STAC API & PgSTAC (Tích hợp & Liên thông hệ thống)

> **Mục tiêu:** Đóng gói stac-fastapi và PgSTAC vào mạng lưới Docker Compose chung của dự án, đồng bộ hóa các biến môi trường để kết nối thông suốt với dịch vụ PostgreSQL chính thức.

## Task 7.1 - Nghiên cứu STAC

### Checklist

* [x] Hiểu Catalog
* [x] Hiểu Collection
* [x] Hiểu Item
* [x] Hiểu Asset

---

## Task 7.2 - Deploy PgSTAC

### Checklist

* [x] Tạo PgSTAC Container
* [x] Kết nối PostgreSQL

---

## Task 7.3 - Deploy STAC FastAPI

### Checklist

* [x] Deploy STAC API
* [x] Kết nối PgSTAC

---

## Task 7.4 - Test STAC API

### Checklist

* [x] Test endpoint collections

```http
GET /collections
```

---

## Deliverable

* [x] STAC API hoạt động

---

# Epic 8 - TiTiler Server (Cấu hình & Tích hợp)

> **Mục tiêu:** Đưa TiTiler vào Docker Compose chung của hệ thống và chuẩn bị các tham số cấu hình cho render map tiles từ datasets.

## Task 8.1 - Deploy TiTiler

### Checklist

* [x] Tạo TiTiler Container

```text
developmentseed/titiler
```

---

## Task 8.2 - Test Endpoint

### Checklist

* [x] Kiểm tra Health Endpoint

```http
GET /healthz
```

---

## Deliverable

* [x] TiTiler hoạt động

---

# Epic 9 - Docker Compose

## Task 9.1 - Compose Configuration

### Checklist 

* [x] Frontend Service
* [x] Backend Service
* [x] PostgreSQL Service
* [x] Redis Service
* [x] RabbitMQ Service
* [x] PgSTAC Service
* [x] STAC FastAPI Service
* [x] TiTiler Service

---

## Task 9.2 - Docker Network

### Checklist

* [x] Tạo network chung

```text
satellite-network
```

---

## Task 9.3 - Docker Volumes

### Checklist

* [x] postgres-data
* [x] redis-data

---

## Deliverable

* [x] `docker compose up -d` chạy thành công

---

# Epic 10 - Health Checks

## Task 10.1

### Checklist

* [x] Backend Health

```http
GET /health
```

---

## Task 10.2

### Checklist

* [x] Database Health

```http
GET /health/db
```

---

## Task 10.3

### Checklist

* [x] Redis Health

```http
GET /health/redis
```

---

## Task 10.4

### Checklist

* [x] RabbitMQ Health

```http
GET /health/rabbitmq
```

---

## Deliverable

* [x] Tất cả health check pass

---

# Epic 11 - Documentation

## Task 11.1 - README

### Checklist

* [x] Project Overview
* [x] Tech Stack
* [x] Setup Guide
* [x] Run Guide

---

## Task 11.2 - Environment Variables

### Checklist

* [x] Tạo .env.example

---

## Task 11.3 - Architecture Diagram

### Checklist

* [x] Sơ đồ tổng thể hệ thống

---

# Sprint 0 Definition Of Done

## Infrastructure

* [x] Frontend chạy được
* [x] Backend chạy được
* [x] PostgreSQL chạy được
* [x] PostGIS chạy được
* [x] Redis chạy được
* [x] RabbitMQ chạy được

## GIS Stack

* [x] PgSTAC chạy được
* [x] STAC FastAPI chạy được
* [x] TiTiler chạy được

## Deployment

* [x] Docker Compose chạy thành công
* [x] Toàn bộ service cùng network

## API

* [x] Swagger hoạt động
* [x] Health Checks hoạt động

## Documentation

* [x] README hoàn chỉnh
* [x] .env.example hoàn chỉnh

---

# Sprint 0 Success Criteria

Sprint 0 được xem là hoàn thành khi:

```bash
docker compose up -d
```

khởi động thành công toàn bộ hệ thống và người phát triển mới có thể clone repository, cấu hình `.env`, chạy một lệnh duy nhất và sử dụng được toàn bộ môi trường phát triển.
