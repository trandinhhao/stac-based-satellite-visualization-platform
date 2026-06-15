# Sprint 7 - Realtime Communication & Job Monitoring

## Thông tin Sprint

**Mục tiêu:** Xây dựng hệ thống giao tiếp thời gian thực giữa Backend và Frontend để theo dõi trạng thái xử lý nền.

**Thời lượng:** 1 tuần

**Phụ thuộc:**

* Sprint 0 hoàn thành
* Sprint 1 hoàn thành
* Sprint 2 hoàn thành
* Sprint 3 hoàn thành
* Sprint 4 hoàn thành
* Sprint 5 hoàn thành
* Sprint 6 hoàn thành
* RabbitMQ hoạt động
* Celery hoạt động

---

# Mục tiêu Sprint

Sau Sprint 7, người dùng có thể:

* Theo dõi tiến độ Job theo thời gian thực
* Nhận thông báo Job hoàn thành
* Nhận thông báo Job lỗi
* Xem tiến trình xử lý %
* Không cần polling liên tục

---

# Epic 1 - Realtime Architecture

## Task 1.1 - Thiết kế Realtime Flow

### Checklist

* [x] WebSocket Gateway
* [x] Job Event Publisher
* [x] Frontend WebSocket Client

---

## Flow

```text
User

↓

Create Job

↓

RabbitMQ

↓

Worker

↓

Progress Event

↓

WebSocket Server

↓

Frontend
```

---

## Deliverable

* [x] Kiến trúc realtime hoàn chỉnh

---

# Epic 2 - WebSocket Server

## Task 2.1 - WebSocket Setup

### Checklist

* [x] FastAPI WebSocket
* [x] Connection Manager
* [x] Client Registry

---

## Endpoint

```http
/ws/jobs
```

---

## Deliverable

* [x] WebSocket Server hoạt động

---

## Task 2.2 - Connection Management

### Checklist

* [x] Connect
* [x] Disconnect
* [x] Reconnect

---

## Deliverable

* [x] Quản lý kết nối ổn định

---

# Epic 3 - Job Events

## Task 3.1 - Job Started Event

### Checklist

* [x] Publish Event
* [x] Broadcast Event

---

## Example

```json
{
  "event": "job_started",
  "job_id": "abc123"
}
```

---

## Deliverable

* [x] Event hoạt động

---

## Task 3.2 - Job Progress Event

### Checklist

* [x] Progress Update
* [x] Percentage Update

---

## Example

```json
{
  "event": "job_progress",
  "job_id": "abc123",
  "progress": 45
}
```

---

## Deliverable

* [x] Progress realtime hoạt động

---

## Task 3.3 - Job Completed Event

### Checklist

* [x] Completion Event

---

## Example

```json
{
  "event": "job_completed",
  "job_id": "abc123"
}
```

---

## Deliverable

* [x] Completion Event hoạt động

---

## Task 3.4 - Job Failed Event

### Checklist

* [x] Error Event

---

## Example

```json
{
  "event": "job_failed",
  "job_id": "abc123",
  "error": "Timeout"
}
```

---

## Deliverable

* [x] Failure Event hoạt động

---

# Epic 4 - Event Bus Integration

## Task 4.1 - Worker → WebSocket Communication

### Checklist

* [x] Worker Publish Event
* [x] Backend Consume Event

---

## Flow

```text
Celery Worker

↓

Redis Pub/Sub

↓

WebSocket Service

↓

Frontend
```

---

## Deliverable

* [x] Worker gửi event thành công

---

# Epic 5 - Frontend WebSocket Client

## Task 5.1 - WebSocket Client

### Checklist

* [x] Configure Vite WebSocket Proxy (`vite.config.ts`)
* [x] Open Connection
* [x] Receive Message
* [x] Auto Reconnect

---

## Deliverable

* [x] WebSocket Client hoạt động

---

## Task 5.2 - Event Handling

### Checklist

* [x] Started Event
* [x] Progress Event
* [x] Completed Event
* [x] Failed Event

---

## Deliverable

* [x] Event xử lý đúng

---

# Epic 6 - Job Progress UI

## Task 6.1 - Progress Bar

### Checklist

* [x] Percentage
* [x] Animation

---

## Wireframe

```text
Processing...

████████░░░░░░░░░░

40%
```

---

## Deliverable

* [x] Progress Bar hoạt động

---

## Task 6.2 - Job Status Badge

### Checklist

* [x] Pending
* [x] Running
* [x] Completed
* [x] Failed

---

## Example

```text
[RUNNING]
```

---

## Deliverable

* [x] Status Badge hoạt động

---

# Epic 7 - Notification System (MUI Custom Glassmorphism)

## Task 7.1 - Success Notification

### Checklist

* [x] Custom Glassmorphic Toast/Snackbar utilizing MUI `@mui/material`

---

## Example

```text
Job completed successfully.
```

---

## Deliverable

* [x] Success Notification hoạt động

---

## Task 7.2 - Error Notification

### Checklist

* [x] Custom Glassmorphic Error Toast/Snackbar utilizing MUI `@mui/material`

---

## Example

```text
Job failed.
```

---

## Deliverable

* [x] Error Notification hoạt động

---

# Epic 8 - Job Dashboard Realtime

## Task 8.1 - Auto Update Job List

### Checklist

* [x] Realtime Update

---

## Deliverable

* [x] Dashboard cập nhật realtime

---

## Task 8.2 - Job Detail Live Update

### Checklist

* [x] Progress Update
* [x] Result Update

---

## Deliverable

* [x] Chi tiết Job cập nhật realtime

---

# Epic 9 - Realtime AOI Processing

## Task 9.1 - AOI Search Progress

### Checklist

* [x] Progress Tracking

---

## Example

```text
Searching Sentinel-2 Images

20%
```

---

## Deliverable

* [x] AOI Search realtime

---

# Epic 10 - Realtime Comparison Processing

## Task 10.1 - Temporal Analysis Progress

### Checklist

* [x] Compare Progress

---

## Example

```text
Generating Comparison

65%
```

---

## Deliverable

* [x] Comparison realtime

---

# Epic 11 - SSE Fallback (Optional - Native FastAPI)

## Task 11.1 - SSE Endpoint

### Checklist

* [x] Server Sent Events via native FastAPI `StreamingResponse` (no extra packages)

---

## Endpoint

```http
GET /events/jobs
```

---

## Deliverable

* [x] SSE hoạt động

---

# Epic 12 - Frontend State Management

## Task 12.1 - Realtime Store

### Checklist

* [x] Socket State
* [x] Connection State
* [x] Job Events

---

## Example

```ts
interface RealtimeState {
  connected: boolean;
  jobs: Job[];
}
```

---

## Deliverable

* [x] Store hoạt động

---

# Epic 13 - Monitoring

## Task 13.1 - WebSocket Monitoring

### Checklist

* [x] Active Connections
* [x] Connection Metrics

---

## Deliverable

* [x] Monitoring hoạt động

---

## Task 13.2 - Event Metrics

### Checklist

* [x] Event Count
* [x] Event Throughput

---

## Deliverable

* [x] Event Tracking hoạt động

---

# Epic 14 - Testing

## Task 14.1 - Connection Testing

### Checklist

* [x] Connect
* [x] Disconnect
* [x] Reconnect

---

## Task 14.2 - Event Testing

### Checklist

* [x] Started
* [x] Progress
* [x] Completed
* [x] Failed

---

## Task 14.3 - Load Testing

### Checklist

* [x] 50 Connections
* [x] 100 Connections

---

## KPI

* [x] Event Delivery < 200ms
* [x] Reconnect < 5s
* [x] 100 Concurrent Connections

---

# Sprint 7 Demo Scenario

## Demo Flow

### Bước 1

Tạo Job:

```text
Temporal Comparison
```

---

### Bước 2

Dashboard xuất hiện:

```text
Status

QUEUED
```

---

### Bước 3

Worker bắt đầu xử lý

---

### Bước 4

Progress Bar cập nhật

```text
10%

25%

50%

75%

100%
```

---

### Bước 5

Job hoàn thành

```text
COMPLETED
```

---

### Bước 6

Toast Notification xuất hiện

```text
Comparison completed successfully.
```

---

### Bước 7

Người dùng mở kết quả

---

# Sprint 7 Definition Of Done

## Backend

* [x] WebSocket Server
* [x] Event Publisher
* [x] Event Broadcast

## Frontend

* [x] WebSocket Client
* [x] Progress Bar
* [x] Notifications

## Integration

* [x] Celery → WebSocket
* [x] Redis Pub/Sub

## Monitoring

* [x] Active Connections
* [x] Event Metrics

## Performance

* [x] Event dưới 200ms
* [x] 100 Connections đồng thời

---

# Sprint 7 Success Criteria

Người dùng có thể:

* Theo dõi Job realtime
* Nhận thông báo khi Job hoàn thành
* Không cần polling API

Hệ thống đã hoàn thiện yêu cầu "Realtime Communication" trong đề bài Viettel Digital Talent bằng cách sử dụng WebSocket, Redis Pub/Sub và Celery Events.

Sau Sprint 7, kiến trúc hiệu năng cao của hệ thống gần như đã hoàn chỉnh. Sprint 8 sẽ tập trung vào tính năng AI Detection (Optional) để phát hiện đối tượng như xe, tàu thuyền hoặc máy bay trên ảnh vệ tinh.
