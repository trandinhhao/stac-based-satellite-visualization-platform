# Sprint 6 - Async Processing & Job Management

## Thông tin Sprint

**Mục tiêu:** Xây dựng hệ thống xử lý bất đồng bộ cho các tác vụ GIS nặng nhằm tránh nghẽn API và tăng khả năng mở rộng.

**Thời lượng:** 1 tuần

**Phụ thuộc:**

* Sprint 0 hoàn thành
* Sprint 1 hoàn thành
* Sprint 2 hoàn thành
* Sprint 3 hoàn thành
* Sprint 4 hoàn thành
* Sprint 5 hoàn thành
* RabbitMQ hoạt động
* Redis hoạt động

---

# Mục tiêu Sprint

Sau Sprint 6, hệ thống có thể:

* Tạo Job xử lý nền
* Đưa Job vào Queue
* Worker xử lý Job
* Theo dõi trạng thái Job
* Lưu kết quả Job
* Retry khi Job lỗi

---

# Epic 1 - Async Architecture

## Task 1.1 - Thiết kế Job Processing Flow

### Checklist

* [x] Job Queue
* [x] Worker
* [x] Job Result Storage

---

## Flow

```text
User

↓

POST /jobs

↓

RabbitMQ

↓

Worker

↓

Result

↓

Database
```

---

## Deliverable

* [x] Kiến trúc Async hoàn chỉnh

---

# Epic 2 - Job Entity

## Task 2.1 - Database Design

### Checklist

* [x] Jobs Table
* [x] Status Tracking
* [x] Result Storage

---

## Schema

```sql
CREATE TABLE jobs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    aoi_id UUID REFERENCES aois(id),
    job_type VARCHAR(100),
    status VARCHAR(50),
    progress INTEGER DEFAULT 0,
    result_url TEXT,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP
);
```

---

## Job Status

```text
pending
queued
running
completed
failed
cancelled
```

---

## Deliverable

* [x] Job Table hoạt động

---

# Epic 3 - RabbitMQ Integration

## Task 3.1 - Queue Setup

### Checklist

* [x] Create Exchange
* [x] Create Queue
* [x] Create Routing Key

---

## Queues

```text
aoi-processing

comparison-processing

detection-processing
```

---

## Deliverable

* [x] RabbitMQ Queue hoạt động

---

## Task 3.2 - Publisher Service

### Checklist

* [x] Publish Message
* [x] Serialize Payload

---

## Example

```json
{
  "job_id": "uuid",
  "task": "comparison",
  "payload": {}
}
```

---

## Deliverable

* [x] Message gửi thành công

---

# Epic 4 - Celery Worker

## Task 4.1 - Worker Setup

### Checklist

* [x] Celery Config
* [x] RabbitMQ Broker
* [x] Redis Backend

---

## Deliverable

* [x] Worker hoạt động

---

## Task 4.2 - Worker Health Check

### Checklist

* [x] Worker Ping
* [x] Worker Status

---

## Deliverable

* [x] Worker Monitoring

---

# Epic 5 - Job APIs

## Task 5.1 - Create Job

### Checklist

* [x] Tạo Job
* [x] Queue Job

---

### Endpoint

```http
POST /api/v1/jobs
```

---

### Request

```json
{
  "job_type": "comparison",
  "aoi_id": "uuid"
}
```

---

### Response

```json
{
  "job_id": "uuid",
  "status": "queued"
}
```

---

## Deliverable

* [x] Job được tạo

---

## Task 5.2 - Get Job Status

### Checklist

* [x] Lấy trạng thái Job

---

### Endpoint

```http
GET /api/v1/jobs/{job_id}
```

---

### Response

```json
{
  "status": "running",
  "progress": 40
}
```

---

## Deliverable

* [x] Theo dõi Job

---

## Task 5.3 - Cancel Job

### Checklist

* [x] Hủy Job

---

### Endpoint

```http
DELETE /api/v1/jobs/{job_id}
```

---

## Deliverable

* [x] Hủy Job thành công

---

# Epic 6 - AOI Processing Job

## Task 6.1 - Async AOI Search

### Checklist

* [x] Queue AOI Search
* [x] Store Result

---

## Flow

```text
User

↓

Search AOI

↓

Create Job

↓

Worker

↓

Result
```

---

## Deliverable

* [x] AOI Search Async

---

# Epic 7 - Comparison Processing Job

## Task 7.1 - Async Comparison

### Checklist

* [x] Temporal Comparison
* [x] Export Result

---

## Deliverable

* [x] Comparison Async

---

# Epic 8 - Retry & Failure Handling

## Task 8.1 - Retry Policy

### Checklist

* [x] Retry 3 lần
* [x] Backoff Delay

---

## Example

```text
Attempt 1

↓

Attempt 2

↓

Attempt 3
```

---

## Deliverable

* [x] Retry hoạt động

---

## Task 8.2 - Error Logging

### Checklist

* [x] Save Error
* [x] Error Message

---

## Deliverable

* [x] Log lỗi đầy đủ

---

# Epic 9 - Job Result Storage

## Task 9.1 - Redis Cache

### Checklist

* [x] Temporary Result
* [x] Fast Lookup

---

## Deliverable

* [x] Redis Cache hoạt động

---

## Task 9.2 - Database Persistence

### Checklist

* [x] Long-term Storage

---

## Deliverable

* [x] Result lưu DB

---

# Epic 10 - Job Dashboard

## Task 10.1 - Job List

### Checklist

* [x] Danh sách Job
* [x] Trạng thái

---

## Wireframe

```text
+--------------------------+
| Jobs                     |
+--------------------------+
| AOI Search     RUNNING   |
| Comparison     COMPLETED |
| Detection      FAILED    |
+--------------------------+
```

---

## Deliverable

* [x] Job Dashboard hoạt động

---

## Task 10.2 - Job Detail

### Checklist

* [x] Progress
* [x] Result
* [x] Error

---

## Deliverable

* [x] Job Detail hoạt động

---

# Epic 11 - Monitoring

## Task 11.1 - RabbitMQ Dashboard

### Checklist

* [x] Queue Size
* [x] Consumer Count

---

## Deliverable

* [x] Theo dõi Queue

---

## Task 11.2 - Celery Monitoring

### Checklist

* [x] Flower Setup (Optional)

---

## Deliverable

* [x] Worker Monitoring

---

# Epic 12 - Frontend State Management

## Task 12.1 - Job Store

### Checklist

* [x] Job List
* [x] Current Job

---

## Example

```ts
interface JobState {
  jobs: Job[];
  currentJob?: Job;
}
```

---

## Deliverable

* [x] State hoạt động

---

# Epic 13 - Testing

## Task 13.1 - Queue Testing

### Checklist

* [x] Publish
* [x] Consume

---

## Task 13.2 - Retry Testing

### Checklist

* [x] Worker Failure
* [x] Retry Success

---

## Task 13.3 - Performance Testing

### Checklist

* [x] Concurrent Jobs
* [x] Queue Load

---

## KPI

* [x] Queue Publish < 200ms
* [x] Job Creation < 500ms
* [x] 20 Concurrent Jobs hoạt động

---

# Sprint 6 Demo Scenario

## Demo Flow

### Bước 1

Mở ứng dụng

---

### Bước 2

Chọn:

```text
Temporal Comparison
```

---

### Bước 3

Nhấn:

```text
Generate Analysis
```

---

### Bước 4

API trả về:

```json
{
  "job_id": "abc123"
}
```

---

### Bước 5

Job xuất hiện trong Dashboard

```text
Status

queued
```

---

### Bước 6

Worker xử lý

```text
running
```

---

### Bước 7

Job hoàn thành

```text
completed
```

---

### Bước 8

Hiển thị kết quả

---

# Sprint 6 Definition Of Done

## Queue

* [x] RabbitMQ hoạt động
* [x] Publish Message
* [x] Consume Message

## Worker

* [x] Celery hoạt động
* [x] Retry hoạt động

## Backend

* [x] Job APIs
* [x] Job Status

## Data

* [x] Result Storage
* [x] Error Logging

## Monitoring

* [x] Dashboard hoạt động

## Performance

* [x] Job Creation dưới 500ms
* [x] 20 Jobs đồng thời

---

# Sprint 6 Success Criteria

Người dùng có thể:

* Tạo Job xử lý nền
* Theo dõi trạng thái Job
* Nhận kết quả sau khi xử lý

Hệ thống không còn thực hiện các tác vụ nặng trực tiếp trong request-response cycle mà đã chuyển sang mô hình bất đồng bộ sử dụng RabbitMQ + Celery. Đây là nền tảng quan trọng cho Sprint 7 (Realtime Communication) và Sprint 8 (AI Detection).
