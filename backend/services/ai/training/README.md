# 🛰️ Mô hình AI Nhận diện Vệ tinh Tối ưu (Pre-trained SOTA Weights)

Thư mục này chứa 3 mô hình AI chuyên biệt đã được tích hợp và tối ưu hóa độ phân giải cho hệ thống nhận diện vệ tinh:

---

## 📁 Cấu trúc Thư mục

```text
backend/services/ai/training/
├── airplane_best.pt   # Mô hình Nhận diện Máy bay (ITU Remote Sensing Lab 2025 - YOLOv8l 960x960)
├── ship_large_best.pt # Mô hình Nhận diện Tàu thuyền (HRSC2016 / Optical High-Res - YOLO 1504x1504)
├── vehicle_best.pt    # Mô hình Nhận diện Xe cộ (Geo-trax Aerial Vehicle - YOLOv8s 1280x1280)
└── README.md          # Tài liệu hướng dẫn
```

---

## 🏆 Chi tiết 3 Mô hình SOTA được Tích hợp

### 1. 🛩️ Airplane Model (`airplane_best.pt`)
- **Nguồn**: ITU Remote Sensing Laboratory (2025 Paper: *Exploring YOLOv8 and YOLOv9 for Efficient Airplane Detection*)
- **Kiến trúc**: YOLOv8l (960×960 input resolution)
- **Độ chính xác**: **mAP50 = 99.36%**, **mAP50-95 = 90.25%** (HRPlanes & CORS-ADD datasets)
- **Chức năng**: Nhận diện tất cả các loại máy bay (dân sự, máy bay thương mại Boeing/Airbus, máy bay quân sự, trực thăng) trên ảnh vệ tinh đường băng và bãi đỗ.

### 2. 🚢 Ship Model (`ship_large_best.pt`)
- **Nguồn**: HRSC2016 / Optical High-Resolution Satellite Ship Dataset
- **Kiến trúc**: YOLO Optical Vessel Detector (**1504×1504** input resolution)
- **Độ chính xác**: Tối ưu vượt trội cho các tàu thuyền, tàu container khổng lồ, tàu chở hàng và du thuyền trên ảnh vệ tinh sắc nét.
- **Chức năng**: Phát hiện chính xác mọi loại tàu thuyền trên các vùng biển mở, ven bờ, luồng tàu chạy và cảng biển.

### 3. 🚗 Vehicle Model (`vehicle_best.pt`)
- **Nguồn**: Geo-trax Pipeline (Transportation Research Part C 2025 Paper - EPFL & KAIST)
- **Kiến trúc**: YOLOv8s (**1280×1280** input resolution)
- **Tập dữ liệu**: Train trên 19,339 ảnh hàng không với 679,306 đối tượng (VisDrone, UAVDT, CARPK, Songdo Vision...)
- **Độ chính xác**: **mAP50 Ô tô = 99.2%**, **mAP50 Xe bus = 98.8%**, **mAP50 Xe tải = 93.5%**
- **Chức năng**: Nhận diện xe cộ siêu nhỏ (5-20px) từ ảnh vệ tinh / drone góc nhìn thẳng (Bird's-Eye View).

---

## ⚙️ Cơ chế Hoạt động Backend

Hệ thống Backend Celery Worker (`services/ai/detector.py`) sẽ tự động quét 3 file trọng số `.pt` trong thư mục này. Ngay khi có tác vụ AI Detection được tạo, hệ thống sẽ tự động gọi các mô hình chuyên biệt để dự đoán và tổng hợp kết quả tọa độ GPS chính xác lên bản đồ MapLibre!
