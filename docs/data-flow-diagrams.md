# Data Flow Diagrams

## 1. Tổng quan

Tài liệu này mô tả các luồng dữ liệu chính trong hệ thống. Mục tiêu là giúp
người đọc hiểu dữ liệu đi qua frontend, backend, database, queue, worker và
WebSocket như thế nào.

## 2. Luồng mở ứng dụng

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant DB as PostGIS
    participant WS as WebSocket

    U->>F: Mở http://localhost:3000
    F->>B: GET /api/v1/aois
    B->>DB: SELECT aois
    DB-->>B: AOI rows
    B-->>F: AOI list
    F->>WS: Connect /ws/jobs
    WS-->>F: Connection accepted
    F->>F: Render map + AOI layers
```

## 3. Luồng tạo AOI

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant DB as PostGIS

    U->>F: Vẽ geometry
    F->>F: Lưu tempGeometry trong AOI store
    U->>F: Nhập tên và bấm lưu
    F->>B: POST /api/v1/aois
    B->>B: Validate Polygon
    B->>DB: ST_Area/ST_Perimeter
    DB-->>B: area/perimeter
    B->>DB: INSERT aois
    DB-->>B: inserted id
    B->>DB: SELECT ST_AsGeoJSON
    DB-->>B: AOI response
    B-->>F: AOIResponse
    F->>F: Update Zustand store
    F->>F: Render AOI layer
```

## 4. Luồng cập nhật AOI

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant DB as PostGIS

    U->>F: Chọn AOI và chỉnh sửa
    F->>F: Mapbox Draw direct_select
    U->>F: Lưu thay đổi
    F->>B: PUT /api/v1/aois/{id}
    B->>DB: SELECT AOI exists
    alt Geometry changed
        B->>DB: Recalculate area/perimeter
    end
    B->>DB: UPDATE aois
    B->>DB: SELECT ST_AsGeoJSON
    B-->>F: Updated AOI
    F->>F: Update map layer
```

## 5. Luồng đo đạc

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant DB as PostGIS

    U->>F: Bắt đầu đo LineString/Polygon
    F->>F: Tính nhanh bằng Turf.js
    F->>B: POST /api/v1/measure
    B->>DB: ST_Length hoặc ST_Area/ST_Perimeter
    DB-->>B: Measurement result
    B-->>F: distance/area/perimeter
    F->>F: Hiển thị label và history
```

## 6. Luồng STAC search

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant R as Redis
    participant S as STAC Service

    U->>F: Nhập filter search
    F->>B: POST /api/v1/stac/search
    B->>B: Normalize datetime
    B->>R: Check cache by payload hash
    alt Cache hit
        R-->>B: Cached result
    else Cache miss
        B->>S: Search STAC/Planet source
        S-->>B: FeatureCollection
        B->>R: Cache result 300s
    end
    B-->>F: Search result
    F->>F: Render result list
```

## 7. Luồng chọn STAC item

```mermaid
flowchart LR
    ResultList[Danh sách kết quả] --> Select[Người dùng chọn item]
    Select --> Store[useSTACStore]
    Store --> Indicator[Selected STAC indicator]
    Store --> Map[MapViewer overlay layer]
```

## 8. Luồng tạo AI detection job

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant DB as PostGIS
    participant MQ as RabbitMQ
    participant W as Worker

    U->>F: Chọn AOI và bấm Detect
    F->>B: POST /api/v1/jobs hoặc /api/v1/detections
    B->>DB: INSERT jobs status=queued
    B->>MQ: process_detection_task.apply_async
    B-->>F: job_id
    F->>F: Refresh job list
    MQ->>W: Worker nhận task
```

## 9. Luồng xử lý AI detection trong worker

```mermaid
flowchart TD
    Start[Start task] --> Running[Update job running 10%]
    Running --> LoadAOI[Load AOI geometry from PostGIS]
    LoadAOI --> Detect[run_real_detection]
    Detect --> Tiles[Download/stitch satellite tiles]
    Tiles --> Models[Resolve YOLO models]
    Models --> Infer[Run inference]
    Infer --> Filter[NMS + cross-class + AOI boundary filter]
    Filter --> Save[Save detections to DB]
    Save --> Complete[Update job completed 100%]
```

## 10. Luồng realtime progress

```mermaid
sequenceDiagram
    participant W as Worker
    participant DB as PostGIS
    participant R as Redis
    participant B as Backend Listener
    participant WS as WebSocket
    participant F as Frontend

    W->>DB: UPDATE jobs
    W->>R: PUBLISH job_updates
    B->>R: SUBSCRIBE job_updates
    R-->>B: Message
    B->>WS: Broadcast JSON
    WS-->>F: Event
    F->>F: updateJobFromEvent
```

## 11. Luồng lấy kết quả detection

```mermaid
sequenceDiagram
    participant F as Frontend
    participant B as Backend
    participant DB as PostGIS

    F->>B: GET /api/v1/detections/{job_id}
    B->>DB: SELECT job status
    alt status != completed
        B-->>F: 400 result not ready
    else completed
        B->>DB: SELECT detections WHERE job_id
        DB-->>B: detection rows
        B-->>F: objects
        F->>F: Render bounding boxes
    end
```

## 12. Luồng xóa AOI

```mermaid
flowchart TD
    DeleteAOI[DELETE /api/v1/aois/id] --> Check[Check AOI exists]
    Check --> FindJobs[Find jobs by aoi_id]
    FindJobs --> DeleteDetections[Delete detections by job_id]
    DeleteDetections --> DeleteJobs[Delete jobs]
    DeleteJobs --> DeleteAOIRow[Delete AOI]
    DeleteAOIRow --> Refresh[Frontend refresh AOI/jobs and clear detections]
```

