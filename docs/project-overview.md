# project-overview.md

# Nền tảng xử lý và trực quan hóa ảnh vệ tinh hiệu năng cao dựa trên chuẩn STAC

## 1. Giới thiệu dự án

### 1.1 Bối cảnh

Trong những năm gần đây, dữ liệu ảnh vệ tinh ngày càng được sử dụng rộng rãi trong nhiều lĩnh vực như:

* Giám sát tài nguyên môi trường
* Quy hoạch đô thị
* Nông nghiệp thông minh
* Theo dõi thiên tai
* Quốc phòng và an ninh
* Giám sát giao thông và hạ tầng

Tuy nhiên, việc khai thác dữ liệu ảnh vệ tinh thường gặp nhiều khó khăn do:

* Dung lượng dữ liệu lớn
* Nhiều định dạng dữ liệu khác nhau
* Khó khăn trong việc tìm kiếm theo không gian và thời gian
* Thiếu công cụ trực quan hóa hiệu năng cao trên nền tảng web

Để giải quyết các vấn đề trên, dự án xây dựng một nền tảng WebGIS hiện đại dựa trên chuẩn STAC (SpatioTemporal Asset Catalog), cho phép người dùng tra cứu, trực quan hóa và phân tích dữ liệu ảnh vệ tinh một cách hiệu quả.

---

## 2. Mục tiêu dự án

### 2.1 Mục tiêu tổng quát

Xây dựng hệ thống WebGIS hỗ trợ:

* Quản lý dữ liệu ảnh vệ tinh theo chuẩn STAC
* Trực quan hóa dữ liệu trên nền tảng web
* Phân tích dữ liệu không gian
* So sánh ảnh theo thời gian
* Hỗ trợ xử lý bất đồng bộ cho các tác vụ nặng
* Sẵn sàng tích hợp các mô hình AI trong tương lai

---

### 2.2 Mục tiêu cụ thể

#### Nhóm chức năng hiển thị bản đồ

* Hiển thị bản đồ nền từ nhiều nguồn dữ liệu
* Hiển thị ảnh vệ tinh Sentinel-2
* Hỗ trợ zoom, pan và điều hướng bản đồ
* Chuyển đổi giữa nhiều lớp dữ liệu
* Tìm kiếm theo địa danh
* Tìm kiếm theo tọa độ

#### Nhóm công cụ tương tác

* Vẽ AOI (Area Of Interest)
* Chỉnh sửa AOI
* Đo khoảng cách
* Đo diện tích
* Đo chu vi
* Xuất dữ liệu AOI

#### Nhóm công cụ phân tích

* Tìm kiếm ảnh theo thời gian
* So sánh ảnh vệ tinh giữa hai thời điểm
* Theo dõi thay đổi khu vực theo thời gian

#### Nhóm tối ưu hiệu năng

* Redis Cache
* Message Queue
* WebSocket
* Xử lý bất đồng bộ
* Tối ưu tile rendering

#### Nhóm AI nâng cao

* Phát hiện phương tiện giao thông
* Phát hiện tàu thuyền
* Phát hiện máy bay
* Hiển thị kết quả nhận dạng trực tiếp trên bản đồ

---

## 3. Phạm vi dự án

### Trong phạm vi

* Web Application
* STAC Catalog
* Hiển thị bản đồ
* Quản lý layer
* AOI
* Measurement Tool
* Temporal Comparison
* Redis Cache
* RabbitMQ
* WebSocket
* Docker Deployment

### Ngoài phạm vi

* Quản lý dữ liệu vệ tinh quy mô quốc gia
* Huấn luyện mô hình AI từ đầu
* Xử lý dữ liệu thời gian thực từ vệ tinh
* Kubernetes Production Cluster

---

## 4. Đối tượng sử dụng

### Người dùng phổ thông

* Xem bản đồ
* Xem ảnh vệ tinh
* So sánh ảnh

### Nhà nghiên cứu

* Phân tích dữ liệu không gian
* Theo dõi biến động theo thời gian

### Kỹ sư GIS

* Truy vấn dữ liệu STAC
* Quản lý AOI
* Tải dữ liệu phục vụ nghiên cứu

---

## 5. Công nghệ sử dụng

### Frontend

* React
* TypeScript
* Vite
* MapLibre GL JS
* Turf.js
* Zustand

### Backend

* FastAPI
* SQLAlchemy
* Pydantic

### GIS Services

* STAC FastAPI
* PgSTAC
* TiTiler

### Database

* PostgreSQL
* Redis

### Messaging

* RabbitMQ

### Worker

* Celery

### AI

* PyTorch
* YOLO

### Deployment

* Docker
* Docker Compose

---

## 6. Kết quả mong đợi

### Sản phẩm

* Hệ thống WebGIS hoạt động ổn định
* Hỗ trợ đầy đủ các chức năng được yêu cầu
* Giao diện trực quan và thân thiện

### Tài liệu

* Tài liệu thiết kế hệ thống
* Tài liệu API
* Tài liệu triển khai
* Hướng dẫn sử dụng

### Báo cáo

* Slide báo cáo
* Video demo
* Báo cáo tổng kết dự án

---

## 7. Tiêu chí đánh giá

### Chức năng

* Hoàn thành các yêu cầu bắt buộc
* Đảm bảo tính chính xác dữ liệu

### Hiệu năng

* Thời gian phản hồi nhanh
* Tối ưu truy vấn dữ liệu

### Khả năng mở rộng

* Dễ tích hợp dữ liệu mới
* Dễ triển khai thêm dịch vụ

### Trải nghiệm người dùng

* Giao diện dễ sử dụng
* Điều hướng trực quan
* Phản hồi nhanh chóng
