# Hướng dẫn sử dụng Nền tảng Vệ tinh STAC & AI

Tài liệu này hướng dẫn chi tiết cách sử dụng các tính năng trên Nền tảng phân tích và trực quan hóa ảnh vệ tinh hiệu năng cao (STAC + GIS + Geospatial AI).

---

## 1. Tìm kiếm và Trực quan hóa Bản đồ cơ bản

### Tìm kiếm địa điểm (Geocoding)
1. Ở sidebar bên trái, chọn tab **STAC**.
2. Nhập tên địa danh cần tìm kiếm (ví dụ: `Noi Bai Airport`, `Hanoi`) vào ô **Tìm kiếm địa điểm**.
3. Nhấn **Enter** hoặc nhấp vào nút kính lúp. Bản đồ sẽ tự động di chuyển (flyTo) và căn giữa vị trí tìm được.

### Quản lý lớp bản đồ nền
1. Phía cuối của sidebar có bảng **Lớp bản đồ nền & Vệ tinh**.
2. Chọn giữa:
   - **Bản đồ địa lý**: *OpenFreeMap* (mượt mà, tối ưu) hoặc *OpenStreetMap* (chuẩn).
   - **Ảnh vệ tinh nền**: *Google Satellite* (ảnh hàng không chất lượng cao toàn cầu).
   - **Ảnh viễn thám chuyên đề**: Chọn xem trực tiếp các lớp quang học *Sentinel-2*, ảnh Radar xuyên mây *Sentinel-1*, hoặc ảnh đa phổ *Landsat-8* từ dịch vụ dynamic tiling (TiTiler).

---

## 2. Quản lý Vùng quan tâm (AOI - Area of Interest)

### Vẽ và lưu một AOI mới
1. Chuyển sang tab **AOI** trên sidebar.
2. Nhấp chọn một trong các nút công cụ vẽ:
   - **Vẽ đa giác (Polygon)**: Vẽ một hình dạng tự do bất kỳ trên bản đồ. Nhấp đúp chuột để kết thúc vẽ.
   - **Vẽ hình chữ nhật (Rectangle)**: Vẽ một vùng hình hộp chữ nhật kéo thả nhanh.
   - **Vẽ hình tròn (Circle)**: Click chọn tâm, sau đó rê chuột ra ngoài để thiết lập bán kính hình tròn địa trắc.
3. Khi hình vẽ xuất hiện dưới dạng màu vàng hổ phách, nhập **Tên AOI** và **Mô tả**.
4. Nhấn **Lưu vùng AOI**. Vùng vừa vẽ sẽ được lưu vào cơ sở dữ liệu và hiển thị trong danh sách.

### Quản lý danh sách AOI
- **Zoom đến AOI**: Click nút **Chọn** hoặc click trực tiếp vào vùng đa giác trên bản đồ để camera tự động zoom ôm trọn vùng AOI đó.
- **Chỉnh sửa hình học (Edit AOI)**: Click vào biểu tượng cây bút cạnh AOI để tải hình học của AOI đó vào chế độ chỉnh sửa kéo thả nút nút của Mapbox Draw. Nhấn **Cập nhật** để lưu.
- **Xóa AOI**: Click vào biểu tượng thùng rác để gỡ bỏ AOI khỏi hệ thống.
- **Xuất bản đồ GeoJSON**: Click nút xuất dữ liệu để tải tệp GeoJSON của AOI về máy tính.

---

## 3. Công cụ Đo đạc Địa lý (Measurement Tools)

### Đo khoảng cách (Distance)
1. Chuyển sang tab **Đo đạc** trên sidebar.
2. Nhấp chọn nút **Đo khoảng cách** (Thước kẻ).
3. Click các điểm trên bản đồ để vẽ đường đo.
4. Trình duyệt sẽ hiển thị nhãn xanh ngọc lục bảo (emerald) ghi chiều dài từng chặng và tổng khoảng cách tích lũy địa trắc (geodesic) thời gian thực.
5. Nhấp đúp chuột để kết thúc. Nhập tên phép đo và nhấn **Lưu đo đạc** để lưu vào lịch sử.

### Đo diện tích và chu vi (Area & Perimeter)
1. Chọn nút **Đo diện tích** (Đa giác xanh).
2. Click các điểm trên bản đồ để tạo đa giác khép kín.
3. Trọng tâm của đa giác sẽ hiển thị nhãn ghi diện tích (m², ha, hoặc km²) và chu vi thời gian thực.
4. Nhấp đúp chuột để kết thúc, đặt tên và lưu phép đo.

### Quản lý phép đo
- Nhấn **Xuất GeoJSON** hoặc **Xuất CSV** trong bảng lịch sử đo đạc để tải dữ liệu thống kê tọa độ và các thông số khoảng cách/diện tích về máy tính.

---

## 4. Đối chiếu Ảnh Vệ tinh theo Thời gian (Temporal Comparison)

Tính năng so sánh ảnh vệ tinh chụp ở các thời kỳ khác nhau để phát hiện sự thay đổi địa lý (Change Detection).

1. Chuyển sang tab **So sánh** trên sidebar.
2. Tìm kiếm ảnh vệ tinh STAC, trong danh sách kết quả, click chọn gán:
   - **Đặt làm Ảnh A (T1 - Trước)**: Mốc thời gian quá khứ.
   - **Đặt làm Ảnh B (T2 - Sau)**: Mốc thời gian hiện tại/tương lai.
3. Chọn chế độ so sánh:
   - **Song song (Side-by-Side)**: Màn hình chia đôi hiển thị hai bản đồ độc lập. Khi bạn Zoom/Pan trên bản đồ này, bản đồ kia sẽ tự động di chuyển đồng bộ 100% tọa độ và góc nhìn.
   - **Thanh trượt (Swipe)**: Chồng hai ảnh vệ tinh lên nhau. Bạn kéo thanh trượt từ trái qua phải để trượt khám phá sự thay đổi cực kỳ sinh động.
4. Nhấn **Chụp ảnh màn hình (Snapshot)** để xuất tệp ảnh PNG tổng hợp so sánh độ phân giải cao kèm chú thích nhãn mốc thời gian T1/T2.

---

## 5. Tiền trình Tác vụ Nền & Nhận diện Vật thể AI (AI Object Detection)

### Theo dõi tác vụ nền (Celery Jobs)
1. Chuyển sang tab **Tác vụ** trên sidebar.
2. Toàn bộ các yêu cầu xử lý dữ liệu nặng hoặc chạy AI sẽ hiển thị ở đây kèm trạng thái màu sắc (Đang chờ - Pending, Đang xử lý - Running, Hoàn thành - Completed, Thất bại - Failed).
3. Tiến độ phần trăm được cập nhật thời gian thực qua giao diện WebSocket mượt mà. Bạn có thể nhấn nút **Hủy** để dừng khẩn cấp tác vụ đang chạy.

### Nhận diện đối tượng AI (YOLO)
1. Chuyển sang tab **AI** trên sidebar.
2. Chọn **AOI mục tiêu** và **Mô hình AI** mong muốn (YOLOv8 hoặc YOLOv11).
3. Nhấn **Bắt đầu Phân tích AI**. Tác vụ sẽ được đẩy vào Celery xử lý.
4. Khi hoàn thành:
   - Các hộp bao nhận diện (bounding boxes) sẽ xuất hiện trên bản đồ với màu sắc neon trực quan: **Đỏ** cho Máy bay (Aircraft), **Xanh lá** cho Tàu thủy (Ship), **Vàng** cho Xe cộ (Vehicle).
   - Sidebar hiển thị bảng thống kê số lượng từng loại đối tượng phát hiện được và danh sách chi tiết kèm độ tin cậy (Confidence %).
   - Click vào bất kỳ đối tượng nào trong danh sách để camera bản đồ tự động bay và zoom cận cảnh vào tâm vật thể đó.
   - Nhấn **Xuất GeoJSON** hoặc **Xuất CSV** để tải tệp tọa độ các vật thể phát hiện được phục vụ cho phân tích GIS nâng cao.
