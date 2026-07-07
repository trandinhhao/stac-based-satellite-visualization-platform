# AI Training Weights

Thư mục này là nơi đặt các file trọng số YOLO (`.pt`) dùng bởi pipeline AI
detection của backend.

Code đọc model trong:

```text
backend/services/ai/detector.py
```

Task gọi pipeline trong:

```text
backend/workers/tasks.py
```

## 1. Vai trò của thư mục

Khi người dùng tạo job AI detection, Celery worker sẽ:

1. Lấy geometry AOI từ PostgreSQL.
2. Tính bounding box của AOI.
3. Tải/ghép ảnh vệ tinh cho vùng AOI.
4. Tìm các file model trong thư mục này.
5. Chạy YOLO inference.
6. Lọc kết quả.
7. Lưu bounding box vào bảng `detections`.

Nếu không tìm thấy model phù hợp, hệ thống có cơ chế fallback:

- Tìm model dự phòng như `best.pt`.
- Nếu vẫn không có, thử dùng model mặc định từ Ultralytics.
- Nếu thiếu thư viện hoặc inference lỗi, tạo mock detections để phục vụ demo.

## 2. Tên file model được pipeline ưu tiên

Theo cấu hình hiện tại trong `SPECIALIZED_MODELS`, các file được ưu tiên gồm:

| Lớp | File mong đợi | Ghi chú |
| --- | --- | --- |
| `aircraft` | `airplane_best.pt` | Nhận diện máy bay |
| `ship` | `ship_best.pt` | Nhận diện tàu |
| `vehicle` | `vehicle_best.pt` | Nhận diện xe |

Ngoài ra pipeline có thể tìm fallback:

```text
best.pt
```

hoặc model mặc định của Ultralytics nếu không có file local.

## 3. Cấu trúc khuyến nghị

```text
backend/services/ai/training/
├── airplane_best.pt
├── ship_best.pt
├── vehicle_best.pt
└── README.md
```

Các file `.pt` thường có dung lượng lớn. Tùy chính sách repo, có thể không
commit trực tiếp model vào Git mà lưu bằng một trong các cách sau:

- Git LFS.
- Object storage nội bộ.
- Shared drive.
- Download script trong pipeline triển khai.

Nếu không commit model, cần cập nhật tài liệu triển khai để người vận hành biết
cách đặt model vào đúng vị trí trước khi chạy worker.

## 4. Các lớp nhận diện

Pipeline hiện chuẩn hóa kết quả về 3 lớp:

- `aircraft`: máy bay, trực thăng hoặc vật thể hàng không tương tự.
- `ship`: tàu, thuyền, phương tiện nổi trên mặt nước.
- `vehicle`: xe con, xe tải, xe buýt hoặc phương tiện đường bộ nhìn từ trên cao.

Kết quả cuối cùng lưu trong database có dạng:

```json
{
  "object_class": "vehicle",
  "confidence": 0.91,
  "bbox": [105.8001, 21.0201, 105.8008, 21.0208]
}
```

`bbox` là bounding box theo tọa độ địa lý:

```text
[min_lng, min_lat, max_lng, max_lat]
```

## 5. Lưu ý khi thay model

Khi thay hoặc thêm model mới, cần kiểm tra:

- Class index của model có khớp với lớp mong muốn không.
- Confidence threshold trong `SPECIALIZED_MODELS`.
- Input size (`imgsz`) phù hợp với model.
- Có cần chạy tiled inference hay không.
- Có cần giới hạn class bằng tham số `classes` không.
- Có cần cập nhật logic lọc false positive không.

Sau khi thay model, nên chạy thử với AOI nhỏ trước để kiểm tra:

- Worker có load model thành công không.
- Tiến trình job có cập nhật tới frontend không.
- Kết quả có được lưu vào bảng `detections` không.
- Bounding box có nằm đúng vị trí trên bản đồ không.

