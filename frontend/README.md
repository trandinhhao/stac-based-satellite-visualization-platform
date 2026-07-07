# Frontend README

Frontend là ứng dụng bản đồ web của STAC-Based Satellite Visualization Platform.
Ứng dụng được xây dựng bằng React, TypeScript, Vite, MapLibre GL, Mapbox Draw,
Turf.js, Zustand, Axios và Lucide React.

Giao diện được thiết kế như một GIS workbench: bản đồ chiếm toàn màn hình, các
công cụ nằm trong thanh điều hướng nổi bên trái, thông tin trạng thái và tác vụ
nền nằm ở góc phải/bên dưới bản đồ.

## 1. Vai trò

Frontend chịu trách nhiệm:

- Hiển thị bản đồ nền và layer dữ liệu.
- Cho phép tìm kiếm vị trí.
- Cho phép tìm kiếm ảnh vệ tinh STAC.
- Cho phép vẽ, lưu, cập nhật, import/export AOI.
- Cho phép đo khoảng cách, diện tích và chu vi.
- Tạo job AI detection cho AOI được chọn.
- Hiển thị tiến trình job realtime qua WebSocket.
- Hiển thị kết quả detection trên bản đồ.
- Hiển thị notification và job widget.

## 2. Công nghệ chính

| Công nghệ | Vai trò |
| --- | --- |
| React 19 | Component UI |
| TypeScript | Kiểu dữ liệu frontend |
| Vite | Dev server, build tool, proxy |
| MapLibre GL | Render bản đồ |
| Mapbox GL Draw | Vẽ và chỉnh sửa geometry |
| Turf.js | Tính toán geometry phía client |
| Zustand | Quản lý state |
| Axios | Gọi REST API |
| Lucide React | Icon |
| Tailwind CSS | Styling utility |
| MUI | Một phần UI component |

## 3. Cấu trúc thư mục

```text
frontend/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── AOIManagerPanel.tsx
│   │   ├── DetectionPanel.tsx
│   │   ├── FloatingJobsWidget.tsx
│   │   ├── MapLayersSwitcher.tsx
│   │   ├── MapViewer.tsx
│   │   ├── MeasurementPanel.tsx
│   │   ├── NotificationToast.tsx
│   │   ├── SearchLocation.tsx
│   │   └── STACSearchPanel.tsx
│   ├── layouts/
│   │   └── MainLayout.tsx
│   ├── services/
│   │   ├── api.ts
│   │   └── queryClient.ts
│   ├── store/
│   │   ├── useAOIStore.ts
│   │   ├── useDetectionStore.ts
│   │   ├── useJobStore.ts
│   │   ├── useMapStore.ts
│   │   ├── useMeasurementStore.ts
│   │   ├── useNotificationStore.ts
│   │   ├── useSTACStore.ts
│   │   └── useWebSocketStore.ts
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── Dockerfile
├── package.json
└── vite.config.ts
```

## 4. Luồng giao diện chính

`App.tsx` render `MainLayout`.

`MainLayout.tsx` tạo bố cục chính:

- Map fullscreen.
- Navigation rail bên trái.
- Drawer panel theo tab.
- Status bar tọa độ/zoom.
- Selected AOI indicator.
- Selected STAC item indicator.
- Current measurement card.
- Notification toast.
- Layer switcher.
- Floating jobs widget.

Các tab chính:

- `location`: tìm kiếm địa điểm/tọa độ.
- `measure`: đo đạc.
- `aoi`: quản lý vùng quan tâm.
- `search`: tìm kiếm STAC.
- `ai`: chạy AI detection.

Panel nặng được lazy-load bằng `React.lazy` để giảm bundle ban đầu.

## 5. MapViewer

`MapViewer.tsx` là component bản đồ trung tâm. Nó quản lý:

- Khởi tạo MapLibre map.
- Thêm base layers.
- Thêm Mapbox Draw control.
- Custom draw mode cho rectangle.
- Custom draw mode cho circle.
- Custom direct select behavior để chỉnh sửa circle/AOI/STAC geometry.
- Render AOI layer.
- Render STAC overlay.
- Render measurement labels.
- Render completed measurements.
- Render detection bounding boxes.
- Đồng bộ map với Zustand stores.
- Xử lý sự kiện draw create/update/delete.

File này hiện khá lớn và chứa nhiều trách nhiệm. Khi refactor, nên tách thành:

- `map/initMap.ts`
- `map/drawModes.ts`
- `map/aoiLayers.ts`
- `map/stacLayers.ts`
- `map/measurementLayers.ts`
- `map/detectionLayers.ts`
- `hooks/useMapDrawEvents.ts`
- `hooks/useMapLayerSync.ts`

## 6. State management

Frontend dùng Zustand. Các store chính:

### `useMapStore`

Lưu trạng thái bản đồ:

- center
- zoom
- selected base layer
- search results
- search pin

### `useAOIStore`

Quản lý AOI:

- danh sách AOI
- AOI đang chọn
- multi-select AOI
- trạng thái vẽ
- trạng thái chỉnh sửa
- drawer/tab state
- gọi API tạo/sửa/xóa/import AOI

### `useSTACStore`

Quản lý tìm kiếm STAC:

- collection được chọn
- item được chọn
- danh sách STAC item đã pin lên bản đồ
- geometry tạm khi vẽ vùng search
- trạng thái edit geometry STAC

### `useMeasurementStore`

Quản lý đo đạc:

- loại đo hiện tại
- measurement đang vẽ
- lịch sử measurement
- hover/selection state

### `useJobStore`

Quản lý jobs:

- danh sách job
- fetch job
- tạo job
- cancel job
- polling fallback khi WebSocket mất kết nối
- cập nhật job từ WebSocket event

### `useWebSocketStore`

Quản lý kết nối `/ws/jobs`:

- connect/disconnect
- heartbeat ping/pong
- reconnect
- chuyển event sang `useJobStore`

### `useDetectionStore`

Quản lý kết quả AI detection:

- start detection
- fetch detection result
- clear detection
- selected object
- label visibility

## 7. API client

File: `src/services/api.ts`

Axios client chính:

```ts
export const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

Trong Docker/Vite, `/api` được proxy tới backend trong `vite.config.ts`.

Geocoding client:

```ts
export const geocodingApi = axios.create({
  baseURL: 'https://nominatim.openstreetmap.org',
  timeout: 10000,
});
```

## 8. Vite proxy

`vite.config.ts` cấu hình proxy:

| Path | Target |
| --- | --- |
| `/api` | `http://backend:8000` |
| `/ws` | `ws://backend:8000` |
| `/stac` | `http://stac-fastapi:8080` |
| `/cog` | `http://titiler:8002` |

Điều này cho phép frontend gọi path tương đối khi chạy trong Docker network.

## 9. Chạy frontend local

Cài dependencies:

```bash
cd frontend
npm install
```

Chạy dev server:

```bash
npm run dev
```

Mặc định Vite chạy trên:

```text
http://localhost:3000
```

Nếu chạy ngoài Docker, cần đảm bảo proxy target trong `vite.config.ts` trỏ tới
đúng host backend. Trong Docker, target dùng tên service như `backend`,
`stac-fastapi`, `titiler`.

## 10. Build

```bash
npm run build
```

Build script chạy:

```bash
tsc -b && vite build
```

Kết quả build nằm trong `dist/`.

## 11. Lint

```bash
npm run lint
```

Lưu ý: code hiện tại có nhiều `any`, đặc biệt quanh Mapbox Draw custom modes do
type của thư viện này không bao phủ đầy đủ các extension nội bộ. Nếu siết lint
type-aware, nên làm theo từng bước để tránh phải refactor quá rộng cùng lúc.

## 12. Docker

Dockerfile hiện tại chạy Vite dev server:

```text
npm run dev -- --host 0.0.0.0 --port 3000
```

Cách này phù hợp local/demo vì có hot reload qua volume mount. Production nên
dùng multi-stage build:

1. Stage Node build ra `dist/`.
2. Stage Nginx/Caddy serve static files.
3. Reverse proxy `/api` và `/ws` tới backend.

## 13. Các điểm cần chú ý khi phát triển

- `MapViewer.tsx` là vùng dễ phát sinh regression nhất, nên test thủ công kỹ
  sau mỗi thay đổi liên quan draw/layer.
- AOI, STAC drawing và measurement cùng dùng Mapbox Draw, cần tránh xung đột
  mode.
- Khi chuyển tab, nhiều store có logic cleanup; sửa tab flow cần kiểm tra lại
  selected AOI, detection layer và measurement history.
- WebSocket có polling fallback cho job, nhưng UI vẫn nên xử lý trạng thái mất
  kết nối rõ ràng.
- Các text UI hiện bằng tiếng Việt, cần giữ thống nhất thuật ngữ.

