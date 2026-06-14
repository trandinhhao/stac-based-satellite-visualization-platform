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

* [ ] WebSocket Gateway
* [ ] Job Event Publisher
* [ ] Frontend WebSocket Client

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

* [ ] Kiến trúc realtime hoàn chỉnh

---

# Epic 2 - WebSocket Server

## Task 2.1 - WebSocket Setup

### Checklist

* [ ] FastAPI WebSocket
* [ ] Connection Manager
* [ ] Client Registry

---

## Endpoint

```http
/ws/jobs
```

---

## Deliverable

* [ ] WebSocket Server hoạt động

---

## Task 2.2 - Connection Management

### Checklist

* [ ] Connect
* [ ] Disconnect
* [ ] Reconnect

---

## Deliverable

* [ ] Quản lý kết nối ổn định

---

# Epic 3 - Job Events

## Task 3.1 - Job Started Event

### Checklist

* [ ] Publish Event
* [ ] Broadcast Event

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

* [ ] Event hoạt động

---

## Task 3.2 - Job Progress Event

### Checklist

* [ ] Progress Update
* [ ] Percentage Update

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

* [ ] Progress realtime hoạt động

---

## Task 3.3 - Job Completed Event

### Checklist

* [ ] Completion Event

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

* [ ] Completion Event hoạt động

---

## Task 3.4 - Job Failed Event

### Checklist

* [ ] Error Event

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

* [ ] Failure Event hoạt động

---

# Epic 4 - Event Bus Integration

## Task 4.1 - Worker → WebSocket Communication

### Checklist

* [ ] Worker Publish Event
* [ ] Backend Consume Event

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

* [ ] Worker gửi event thành công

---

# Epic 5 - Frontend WebSocket Client

## Task 5.1 - WebSocket Client

### Checklist

* [ ] Configure Vite WebSocket Proxy (`vite.config.ts`)
* [ ] Open Connection
* [ ] Receive Message
* [ ] Auto Reconnect

---

## Deliverable

* [ ] WebSocket Client hoạt động

---

## Task 5.2 - Event Handling

### Checklist

* [ ] Started Event
* [ ] Progress Event
* [ ] Completed Event
* [ ] Failed Event

---

## Deliverable

* [ ] Event xử lý đúng

---

# Epic 6 - Job Progress UI

## Task 6.1 - Progress Bar

### Checklist

* [ ] Percentage
* [ ] Animation

---

## Wireframe

```text
Processing...

████████░░░░░░░░░░

40%
```

---

## Deliverable

* [ ] Progress Bar hoạt động

---

## Task 6.2 - Job Status Badge

### Checklist

* [ ] Pending
* [ ] Running
* [ ] Completed
* [ ] Failed

---

## Example

```text
[RUNNING]
```

---

## Deliverable

* [ ] Status Badge hoạt động

---

# Epic 7 - Notification System (MUI Custom Glassmorphism)

## Task 7.1 - Success Notification

### Checklist

* [ ] Custom Glassmorphic Toast/Snackbar utilizing MUI `@mui/material`

---

## Example

```text
Job completed successfully.
```

---

## Deliverable

* [ ] Success Notification hoạt động

---

## Task 7.2 - Error Notification

### Checklist

* [ ] Custom Glassmorphic Error Toast/Snackbar utilizing MUI `@mui/material`

---

## Example

```text
Job failed.
```

---

## Deliverable

* [ ] Error Notification hoạt động

---

# Epic 8 - Job Dashboard Realtime

## Task 8.1 - Auto Update Job List

### Checklist

* [ ] Realtime Update

---

## Deliverable

* [ ] Dashboard cập nhật realtime

---

## Task 8.2 - Job Detail Live Update

### Checklist

* [ ] Progress Update
* [ ] Result Update

---

## Deliverable

* [ ] Chi tiết Job cập nhật realtime

---

# Epic 9 - Realtime AOI Processing

## Task 9.1 - AOI Search Progress

### Checklist

* [ ] Progress Tracking

---

## Example

```text
Searching Sentinel-2 Images

20%
```

---

## Deliverable

* [ ] AOI Search realtime

---

# Epic 10 - Realtime Comparison Processing

## Task 10.1 - Temporal Analysis Progress

### Checklist

* [ ] Compare Progress

---

## Example

```text
Generating Comparison

65%
```

---

## Deliverable

* [ ] Comparison realtime

---

# Epic 11 - SSE Fallback (Optional - Native FastAPI)

## Task 11.1 - SSE Endpoint

### Checklist

* [ ] Server Sent Events via native FastAPI `StreamingResponse` (no extra packages)

---

## Endpoint

```http
GET /events/jobs
```

---

## Deliverable

* [ ] SSE hoạt động

---

# Epic 12 - Frontend State Management

## Task 12.1 - Realtime Store

### Checklist

* [ ] Socket State
* [ ] Connection State
* [ ] Job Events

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

* [ ] Store hoạt động

---

# Epic 13 - Monitoring

## Task 13.1 - WebSocket Monitoring

### Checklist

* [ ] Active Connections
* [ ] Connection Metrics

---

## Deliverable

* [ ] Monitoring hoạt động

---

## Task 13.2 - Event Metrics

### Checklist

* [ ] Event Count
* [ ] Event Throughput

---

## Deliverable

* [ ] Event Tracking hoạt động

---

# Epic 14 - Testing

## Task 14.1 - Connection Testing

### Checklist

* [ ] Connect
* [ ] Disconnect
* [ ] Reconnect

---

## Task 14.2 - Event Testing

### Checklist

* [ ] Started
* [ ] Progress
* [ ] Completed
* [ ] Failed

---

## Task 14.3 - Load Testing

### Checklist

* [ ] 50 Connections
* [ ] 100 Connections

---

## KPI

* [ ] Event Delivery < 200ms
* [ ] Reconnect < 5s
* [ ] 100 Concurrent Connections

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

* [ ] WebSocket Server
* [ ] Event Publisher
* [ ] Event Broadcast

## Frontend

* [ ] WebSocket Client
* [ ] Progress Bar
* [ ] Notifications

## Integration

* [ ] Celery → WebSocket
* [ ] Redis Pub/Sub

## Monitoring

* [ ] Active Connections
* [ ] Event Metrics

## Performance

* [ ] Event dưới 200ms
* [ ] 100 Connections đồng thời

---

# Sprint 7 Success Criteria

Người dùng có thể:

* Theo dõi Job realtime
* Nhận thông báo khi Job hoàn thành
* Không cần polling API

Hệ thống đã hoàn thiện yêu cầu "Realtime Communication" trong đề bài Viettel Digital Talent bằng cách sử dụng WebSocket, Redis Pub/Sub và Celery Events.

Sau Sprint 7, kiến trúc hiệu năng cao của hệ thống gần như đã hoàn chỉnh. Sprint 8 sẽ tập trung vào tính năng AI Detection (Optional) để phát hiện đối tượng như xe, tàu thuyền hoặc máy bay trên ảnh vệ tinh.
