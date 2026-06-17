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

- [x] Test Service Layer
- [x] Test Repository Layer
- [x] Test Utility Functions

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

- [x] Unit Test Coverage ≥ 70%

---

## Task 1.2 - API Testing

### Checklist

- [x] Collections API
- [x] Search API
- [x] AOI API
- [x] Comparison API
- [x] Job API
- [x] Detection API

---

## Deliverable

- [x] API Test Pass

---

# Epic 2 - Frontend Testing

## Task 2.1 - Component Testing

### Checklist

- [x] Map Viewer
- [x] Layer Switcher
- [x] AOI Tools
- [x] Measurement Tools
- [x] Compare Viewer
- [x] Job Dashboard

---

## Deliverable

- [x] UI Components ổn định

---

## Task 2.2 - Integration Testing

### Checklist

- [x] Frontend ↔ Backend
- [x] Frontend ↔ WebSocket
- [x] Frontend ↔ TiTiler

---

## Deliverable

- [x] Integration Pass

---

# Epic 3 - GIS Testing

## Task 3.1 - STAC Search Testing

### Checklist

- [x] Search by Date
- [x] Search by AOI
- [x] Search by Collection

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

- [x] STAC Query ổn định

---

## Task 3.2 - Tile Rendering Testing

### Checklist

- [x] TiTiler Rendering
- [x] Tile Loading
- [x] Tile Cache

---

## Deliverable

- [x] Tiles hiển thị chính xác

---

# Epic 4 - AOI Validation

## Task 4.1 - Geometry Validation

### Checklist

- [x] Polygon
- [x] Rectangle

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

- [x] Validation hoàn chỉnh

---

# Epic 5 - Performance Optimization

## Task 5.1 - PostgreSQL Optimization

### Checklist

- [x] Query Analysis
- [x] Index Optimization

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

- [x] Query nhanh hơn

---

## Task 5.2 - PgSTAC Optimization

### Checklist

- [x] Collection Index
- [x] Temporal Index

---

## Deliverable

- [x] Search STAC tối ưu

---

# Epic 6 - Redis Cache

## Task 6.1 - Metadata Cache

### Checklist

- [x] Collection Cache
- [x] Item Cache

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

- [x] Metadata Cache hoạt động

---

## Task 6.2 - Search Result Cache

### Checklist

- [x] Search Cache
- [x] TTL Configuration

---

## Deliverable

- [x] Search nhanh hơn

---

# Epic 7 - Frontend Optimization

## Task 7.1 - Code Splitting

### Checklist

- [x] Lazy Loading
- [x] Route Splitting

---

## Deliverable

- [x] Bundle Size giảm

---

## Task 7.2 - Map Optimization

### Checklist

- [x] Tile Reuse
- [x] Layer Cleanup

---

## Deliverable

- [x] Giảm Memory Usage

---

# Epic 8 - WebSocket Optimization

## Task 8.1 - Connection Stability

### Checklist

- [x] Reconnect
- [x] Heartbeat

---

## Deliverable

- [x] Connection ổn định

---

## Task 8.2 - Event Throttling

### Checklist

- [x] Progress Throttle

---

## Deliverable

- [x] Giảm số lượng event

---

# Epic 9 - Security Review

## Task 9.1 - API Validation

### Checklist

- [x] Request Validation
- [x] Response Validation

---

## Deliverable

- [x] API an toàn

---

## Task 9.2 - Environment Review

### Checklist

- [x] Secrets
- [x] ENV Variables

---

## Deliverable

- [x] Không hardcode credentials

---

# Epic 10 - Logging & Monitoring

## Task 10.1 - Backend Logging

### Checklist

- [x] Request Logs
- [x] Error Logs
- [x] Worker Logs

---

## Deliverable

- [x] Log đầy đủ

---

## Task 10.2 - Monitoring Dashboard

### Checklist

- [x] RabbitMQ
- [x] Redis
- [x] PostgreSQL

---

## Deliverable

- [x] Monitoring hoạt động

---

# Epic 11 - Documentation

## Task 11.1 - Technical Documentation

### Checklist

- [x] Architecture
- [x] Database Design
- [x] API Design

---

## Deliverable

- [x] Docs hoàn chỉnh

---

## Task 11.2 - User Guide

### Checklist

- [x] AOI Guide
- [x] Comparison Guide
- [x] Detection Guide

---

## Deliverable

- [x] Hướng dẫn sử dụng

---

# Epic 12 - Deployment Validation

## Task 12.1 - Docker Environment

### Checklist

- [x] PostgreSQL
- [x] Redis
- [x] RabbitMQ
- [x] FastAPI
- [x] TiTiler
- [x] Frontend

---

## Deliverable

- [x] Docker Compose ổn định

---

## Task 12.2 - Production Deployment

### Checklist

- [x] Reverse Proxy
- [x] SSL
- [x] Domain

---

## Deliverable

- [x] Deploy thành công

---

# Epic 13 - Demo Preparation

## Task 13.1 - Demo Dataset

### Checklist

- [x] Sentinel-2 Dataset
- [x] Demo AOI

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

- [x] Dataset chuẩn bị sẵn

---

## Task 13.2 - Demo Script

### Checklist

- [x] Demo Flow
- [x] Backup Flow

---

## Deliverable

- [x] Kịch bản demo hoàn chỉnh

---

# Epic 14 - Final Acceptance Testing

## Task 14.1 - End-to-End Testing

### Checklist

- [x] Mapping
- [x] Search
- [x] AOI
- [x] Measurement
- [x] Comparison
- [x] Async Processing
- [x] Realtime
- [x] Detection (Optional)

---

## Deliverable

- [x] Hệ thống hoạt động từ đầu tới cuối

---

# KPI Sprint 9

## Backend

- [x] API Response < 500ms
- [x] Search Response < 2s

---

## Frontend

- [x] First Load < 5s
- [x] Lighthouse > 80

---

## GIS

- [x] Tile Render < 1s
- [x] STAC Query < 2s

---

## Realtime

- [x] Event Delay < 200ms

---

## AI Detection (Optional)

- [x] Detection < 30s

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

- [x] Core Mapping
- [x] STAC Search
- [x] AOI
- [x] Measurement
- [x] Comparison
- [x] Async Processing
- [x] Realtime Communication

---

## Hiệu năng

- [x] Redis Cache
- [x] PostgreSQL Optimization
- [x] Frontend Optimization

---

## Chất lượng

- [x] Unit Test
- [x] Integration Test
- [x] E2E Test

---

## Triển khai

- [x] Docker Compose
- [x] Production Deploy

---

## Tài liệu

- [x] Technical Docs
- [x] User Guide
- [x] Presentation Slides

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