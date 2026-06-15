# Sprint 9 - Testing, Optimization & Production Readiness

## Thông tin Sprint

**Mục tiêu:** Hoàn thiện hệ thống, kiểm thử toàn diện, tối ưu hiệu năng và chuẩn bị cho demo cuối kỳ.

**Thời lượng:** 1 tuần

**Phụ thuộc:**

- Sprint 0 → Sprint 7 hoàn thành
- Sprint 8 hoàn thành (nếu triển khai AI Detection)

---

# Mục tiêu Sprint

Sau Sprint 9, hệ thống phải:

- Hoạt động ổn định
- Không có lỗi nghiêm trọng
- Đáp ứng yêu cầu hiệu năng
- Có tài liệu đầy đủ
- Sẵn sàng demo
- Sẵn sàng bàn giao

---

# Epic 1 - Backend Testing

## Task 1.1 - Unit Testing

### Checklist

- [ ] Test Service Layer
- [ ] Test Repository Layer
- [ ] Test Utility Functions

---

### Components

```text
AOI Service

Search Service

Comparison Service

Job Service

Detection Service
```

---

## Deliverable

- [ ] Unit Test Coverage ≥ 70%

---

## Task 1.2 - API Testing

### Checklist

- [ ] Collections API
- [ ] Search API
- [ ] AOI API
- [ ] Comparison API
- [ ] Job API
- [ ] Detection API

---

## Deliverable

- [ ] API Test Pass

---

# Epic 2 - Frontend Testing

## Task 2.1 - Component Testing

### Checklist

- [ ] Map Viewer
- [ ] Layer Switcher
- [ ] AOI Tools
- [ ] Measurement Tools
- [ ] Compare Viewer
- [ ] Job Dashboard

---

## Deliverable

- [ ] UI Components ổn định

---

## Task 2.2 - Integration Testing

### Checklist

- [ ] Frontend ↔ Backend
- [ ] Frontend ↔ WebSocket
- [ ] Frontend ↔ TiTiler

---

## Deliverable

- [ ] Integration Pass

---

# Epic 3 - GIS Testing

## Task 3.1 - STAC Search Testing

### Checklist

- [ ] Search by Date
- [ ] Search by AOI
- [ ] Search by Collection

---

## Test Cases

### Case 1

```text
Collection:
Sentinel-2

Date:
2025-01-01 → 2025-01-31
```

Expected:

```text
Danh sách ảnh Sentinel-2
```

---

## Deliverable

- [ ] STAC Query ổn định

---

## Task 3.2 - Tile Rendering Testing

### Checklist

- [ ] TiTiler Rendering
- [ ] Tile Loading
- [ ] Tile Cache

---

## Deliverable

- [ ] Tiles hiển thị chính xác

---

# Epic 4 - AOI Validation

## Task 4.1 - Geometry Validation

### Checklist

- [ ] Polygon
- [ ] Rectangle

---

## Cases

### Valid Polygon

```text
4 điểm trở lên
```

---

### Invalid Polygon

```text
Polygon tự cắt nhau
```

---

## Deliverable

- [ ] Validation hoàn chỉnh

---

# Epic 5 - Performance Optimization

## Task 5.1 - PostgreSQL Optimization

### Checklist

- [ ] Query Analysis
- [ ] Index Optimization

---

## Indexes

```sql
CREATE INDEX idx_jobs_status
ON jobs(status);
```

```sql
CREATE INDEX idx_aois_geometry
ON aois
USING GIST(geometry);
```

---

## Deliverable

- [ ] Query nhanh hơn

---

## Task 5.2 - PgSTAC Optimization

### Checklist

- [ ] Collection Index
- [ ] Temporal Index

---

## Deliverable

- [ ] Search STAC tối ưu

---

# Epic 6 - Redis Cache

## Task 6.1 - Metadata Cache

### Checklist

- [ ] Collection Cache
- [ ] Item Cache

---

## Flow

```text
Request

↓

Redis

↓

Hit

↓

Response
```

---

## Deliverable

- [ ] Metadata Cache hoạt động

---

## Task 6.2 - Search Result Cache

### Checklist

- [ ] Search Cache
- [ ] TTL Configuration

---

## Deliverable

- [ ] Search nhanh hơn

---

# Epic 7 - Frontend Optimization

## Task 7.1 - Code Splitting

### Checklist

- [ ] Lazy Loading
- [ ] Route Splitting

---

## Deliverable

- [ ] Bundle Size giảm

---

## Task 7.2 - Map Optimization

### Checklist

- [ ] Tile Reuse
- [ ] Layer Cleanup

---

## Deliverable

- [ ] Giảm Memory Usage

---

# Epic 8 - WebSocket Optimization

## Task 8.1 - Connection Stability

### Checklist

- [ ] Reconnect
- [ ] Heartbeat

---

## Deliverable

- [ ] Connection ổn định

---

## Task 8.2 - Event Throttling

### Checklist

- [ ] Progress Throttle

---

## Deliverable

- [ ] Giảm số lượng event

---

# Epic 9 - Security Review

## Task 9.1 - API Validation

### Checklist

- [ ] Request Validation
- [ ] Response Validation

---

## Deliverable

- [ ] API an toàn

---

## Task 9.2 - Environment Review

### Checklist

- [ ] Secrets
- [ ] ENV Variables

---

## Deliverable

- [ ] Không hardcode credentials

---

# Epic 10 - Logging & Monitoring

## Task 10.1 - Backend Logging

### Checklist

- [ ] Request Logs
- [ ] Error Logs
- [ ] Worker Logs

---

## Deliverable

- [ ] Log đầy đủ

---

## Task 10.2 - Monitoring Dashboard

### Checklist

- [ ] RabbitMQ
- [ ] Redis
- [ ] PostgreSQL

---

## Deliverable

- [ ] Monitoring hoạt động

---

# Epic 11 - Documentation

## Task 11.1 - Technical Documentation

### Checklist

- [ ] Architecture
- [ ] Database Design
- [ ] API Design

---

## Deliverable

- [ ] Docs hoàn chỉnh

---

## Task 11.2 - User Guide

### Checklist

- [ ] AOI Guide
- [ ] Comparison Guide
- [ ] Detection Guide

---

## Deliverable

- [ ] Hướng dẫn sử dụng

---

# Epic 12 - Deployment Validation

## Task 12.1 - Docker Environment

### Checklist

- [ ] PostgreSQL
- [ ] Redis
- [ ] RabbitMQ
- [ ] FastAPI
- [ ] TiTiler
- [ ] Frontend

---

## Deliverable

- [ ] Docker Compose ổn định

---

## Task 12.2 - Production Deployment

### Checklist

- [ ] Reverse Proxy
- [ ] SSL
- [ ] Domain

---

## Deliverable

- [ ] Deploy thành công

---

# Epic 13 - Demo Preparation

## Task 13.1 - Demo Dataset

### Checklist

- [ ] Sentinel-2 Dataset
- [ ] Demo AOI

---

## Suggested AOIs

```text
Noi Bai Airport

Cat Lai Port

Ho Chi Minh City

Ha Noi City
```

---

## Deliverable

- [ ] Dataset chuẩn bị sẵn

---

## Task 13.2 - Demo Script

### Checklist

- [ ] Demo Flow
- [ ] Backup Flow

---

## Deliverable

- [ ] Kịch bản demo hoàn chỉnh

---

# Epic 14 - Final Acceptance Testing

## Task 14.1 - End-to-End Testing

### Checklist

- [ ] Mapping
- [ ] Search
- [ ] AOI
- [ ] Measurement
- [ ] Comparison
- [ ] Async Processing
- [ ] Realtime
- [ ] Detection (Optional)

---

## Deliverable

- [ ] Hệ thống hoạt động từ đầu tới cuối

---

# KPI Sprint 9

## Backend

- [ ] API Response < 500ms
- [ ] Search Response < 2s

---

## Frontend

- [ ] First Load < 5s
- [ ] Lighthouse > 80

---

## GIS

- [ ] Tile Render < 1s
- [ ] STAC Query < 2s

---

## Realtime

- [ ] Event Delay < 200ms

---

## AI Detection (Optional)

- [ ] Detection < 30s

---

# Sprint 9 Demo Scenario

## Bước 1

Mở ứng dụng

---

## Bước 2

Tìm kiếm:

```text
Noi Bai Airport
```

---

## Bước 3

Vẽ AOI

---

## Bước 4

Tìm ảnh Sentinel-2

---

## Bước 5

So sánh ảnh:

```text
2024 vs 2025
```

---

## Bước 6

Chạy Job Analysis

---

## Bước 7

Theo dõi Progress Realtime

---

## Bước 8

Nhận kết quả

---

## Bước 9 (Optional)

Chạy AI Detection

---

## Bước 10

Xuất GeoJSON

---

## Bước 11

Kết thúc demo

---

# Sprint 9 Definition Of Done

## Chức năng

- [ ] Core Mapping
- [ ] STAC Search
- [ ] AOI
- [ ] Measurement
- [ ] Comparison
- [ ] Async Processing
- [ ] Realtime Communication

---

## Hiệu năng

- [ ] Redis Cache
- [ ] PostgreSQL Optimization
- [ ] Frontend Optimization

---

## Chất lượng

- [ ] Unit Test
- [ ] Integration Test
- [ ] E2E Test

---

## Triển khai

- [ ] Docker Compose
- [ ] Production Deploy

---

## Tài liệu

- [ ] Technical Docs
- [ ] User Guide
- [ ] Presentation Slides

---

# Sprint 9 Success Criteria

Hệ thống đáp ứng đầy đủ yêu cầu của đề tài:

## Core Features

- Hiển thị bản đồ
- Điều hướng bản đồ
- Layer Switching
- Tìm kiếm vị trí
- STAC Search
- AOI Management
- Measurement Tools
- Temporal Comparison

## Architecture & Performance

- RabbitMQ
- Celery
- Redis Cache
- WebSocket Realtime

## Advanced Features

- AI Detection (Optional)

## Deliverables

- Sản phẩm demo hoạt động ổn định
- Slide báo cáo
- Tài liệu thiết kế
- Source Code hoàn chỉnh

---

# Kết quả cuối cùng

Sau Sprint 9, dự án đã hoàn thành toàn bộ roadmap của đề tài:

```text
Sprint 0  → Project Setup
Sprint 1  → Core Mapping
Sprint 2  → STAC Integration
Sprint 3  → AOI Tools
Sprint 4  → Measurement Tools
Sprint 5  → Temporal Comparison
Sprint 6  → Async Processing
Sprint 7  → Realtime Communication
Sprint 8  → AI Detection (Optional)
Sprint 9  → Testing & Optimization
```

Hệ thống trở thành một nền tảng WebGIS + STAC + Geospatial AI hoàn chỉnh, đáp ứng đầy đủ yêu cầu của đề tài Viettel Digital Talent.