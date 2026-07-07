# Sequence Diagrams

## 1. Mục tiêu

Tài liệu này tập trung vào các sequence diagram chi tiết cho những use case
quan trọng nhất của hệ thống.

## 2. Khởi động frontend và kết nối realtime

```mermaid
sequenceDiagram
    participant Browser
    participant React
    participant AOIStore
    participant WSStore
    participant Backend
    participant DB

    Browser->>React: Load app
    React->>AOIStore: fetchAOIs()
    AOIStore->>Backend: GET /api/v1/aois
    Backend->>DB: SELECT AOIs
    DB-->>Backend: Rows
    Backend-->>AOIStore: AOI[]
    AOIStore-->>React: Update state
    React->>WSStore: connect()
    WSStore->>Backend: WS /ws/jobs
    Backend-->>WSStore: accept
```

## 3. Tạo AOI

```mermaid
sequenceDiagram
    participant User
    participant MapViewer
    participant AOIStore
    participant Backend
    participant PostGIS

    User->>MapViewer: Draw polygon
    MapViewer->>AOIStore: setTempGeometry()
    User->>AOIStore: createAOI(name, description, geometry)
    AOIStore->>Backend: POST /api/v1/aois
    Backend->>Backend: Validate geometry.type == Polygon
    Backend->>PostGIS: ST_Area + ST_Perimeter
    PostGIS-->>Backend: area/perimeter
    Backend->>PostGIS: INSERT INTO aois
    Backend->>PostGIS: SELECT ST_AsGeoJSON
    Backend-->>AOIStore: AOIResponse
    AOIStore-->>MapViewer: State changed
    MapViewer->>MapViewer: Render AOI source/layer
```

## 4. Import AOI

```mermaid
sequenceDiagram
    participant User
    participant AOIPanel
    participant AOIStore
    participant Backend
    participant PostGIS

    User->>AOIPanel: Choose GeoJSON file
    AOIPanel->>AOIStore: importAOI(file)
    AOIStore->>Backend: POST /api/v1/aois/import multipart
    Backend->>Backend: Parse FeatureCollection/Feature/Polygon
    Backend->>Backend: Validate Polygon
    Backend->>PostGIS: Calculate area/perimeter
    Backend->>PostGIS: Insert AOI
    Backend-->>AOIStore: AOIResponse
```

## 5. Đo diện tích

```mermaid
sequenceDiagram
    participant User
    participant MeasurementPanel
    participant MapViewer
    participant MeasurementStore
    participant Backend
    participant PostGIS

    User->>MeasurementPanel: Start area measurement
    MeasurementPanel->>MeasurementStore: set measureType=area
    MapViewer->>MapViewer: draw_polygon mode
    User->>MapViewer: Finish polygon
    MapViewer->>MeasurementStore: Store current measurement
    MapViewer->>Backend: POST /api/v1/measure
    Backend->>PostGIS: ST_Area + ST_Perimeter
    PostGIS-->>Backend: result
    Backend-->>MapViewer: area/perimeter
    MapViewer->>MeasurementStore: Add history
```

## 6. STAC search theo bbox

```mermaid
sequenceDiagram
    participant User
    participant STACPanel
    participant Backend
    participant Redis
    participant STACService

    User->>STACPanel: Submit search filters
    STACPanel->>Backend: POST /api/v1/stac/search
    Backend->>Backend: Validate bbox/datetime
    Backend->>Redis: GET stac_search:hash
    alt cache hit
        Redis-->>Backend: cached result
    else cache miss
        Backend->>STACService: search_stac_images
        STACService-->>Backend: result
        Backend->>Redis: SET cache 300s
    end
    Backend-->>STACPanel: result
```

## 7. Tạo job detection

```mermaid
sequenceDiagram
    participant User
    participant DetectionPanel
    participant JobStore
    participant Backend
    participant DB
    participant RabbitMQ

    User->>DetectionPanel: Click detect
    DetectionPanel->>JobStore: createJob(object_detection, aoiId, payload)
    JobStore->>Backend: POST /api/v1/jobs
    Backend->>Backend: Validate job_type and UUID
    Backend->>DB: INSERT job queued
    Backend->>RabbitMQ: apply_async task_id=job_id
    Backend-->>JobStore: job_id
    JobStore->>Backend: GET /api/v1/jobs
    Backend-->>JobStore: jobs
```

## 8. Worker xử lý detection

```mermaid
sequenceDiagram
    participant RabbitMQ
    participant Worker
    participant DB
    participant Detector
    participant Redis

    RabbitMQ->>Worker: process_detection_task
    Worker->>DB: Update job running 10%
    Worker->>Redis: Publish job_started/progress
    Worker->>DB: SELECT ST_AsGeoJSON(geometry)
    Worker->>Detector: run_real_detection(geometry)
    Detector-->>Worker: detections[]
    Worker->>DB: INSERT detections
    Worker->>DB: Update job completed 100%
    Worker->>Redis: Publish job_completed
```

## 9. WebSocket cập nhật frontend

```mermaid
sequenceDiagram
    participant Worker
    participant Redis
    participant BackendListener
    participant WebSocketManager
    participant Frontend
    participant JobStore

    Worker->>Redis: PUBLISH job_updates
    Redis-->>BackendListener: message
    BackendListener->>WebSocketManager: broadcast(data)
    WebSocketManager-->>Frontend: JSON event
    Frontend->>JobStore: updateJobFromEvent(event)
    JobStore-->>Frontend: Re-render widget/toast
```

## 10. Hủy job

```mermaid
sequenceDiagram
    participant User
    participant JobWidget
    participant Backend
    participant DB
    participant Celery

    User->>JobWidget: Cancel job
    JobWidget->>Backend: DELETE /api/v1/jobs/{job_id}
    Backend->>DB: SELECT status
    alt already finished
        Backend-->>JobWidget: message
    else active
        Backend->>Celery: revoke(task_id, terminate=True)
        Backend->>DB: UPDATE status=cancelled
        Backend-->>JobWidget: cancelled
    end
```

