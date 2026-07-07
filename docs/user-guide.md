# Hướng dẫn sử dụng

## 1. Mở ứng dụng

Sau khi chạy Docker Compose, mở trình duyệt:

```text
http://localhost:3000
```

Giao diện chính là bản đồ toàn màn hình. Các công cụ nằm ở thanh điều hướng bên
trái. Thông tin tọa độ, zoom, AOI đang chọn và STAC item đang chọn nằm ở góc
phải phía trên. Widget jobs nằm ở góc phải phía dưới.

## 2. Các khu vực giao diện

### Bản đồ

Bản đồ là khu vực thao tác chính. Người dùng có thể:

- Kéo để di chuyển bản đồ.
- Cuộn để zoom.
- Xem AOI đã lưu.
- Xem lớp STAC item được chọn.
- Xem bounding box detection.
- Reset view bằng nút home.

### Thanh công cụ bên trái

Các tab chính:

- Tìm kiếm địa điểm.
- Đo đạc.
- AOI.
- STAC.
- AI.

Khi bấm vào một tab, drawer bên cạnh sẽ mở ra. Bấm lại tab đang active để đóng
hoặc mở drawer.

### Status bar

Status bar hiển thị:

- Vĩ độ tâm bản đồ.
- Kinh độ tâm bản đồ.
- Zoom hiện tại.

### Jobs widget

Widget hiển thị danh sách tác vụ nền. Với job AI detection, widget cho biết:

- Trạng thái.
- Tiến trình phần trăm.
- Lỗi nếu có.
- Kết quả khi hoàn thành.

## 3. Tìm kiếm địa điểm

1. Mở tab tìm kiếm.
2. Nhập tên địa điểm hoặc tọa độ.
3. Chọn kết quả.
4. Bản đồ sẽ di chuyển tới vị trí tương ứng.

Tùy cấu hình, hệ thống có thể dùng Mapbox hoặc Nominatim cho geocoding.

## 4. Quản lý AOI

AOI là vùng quan tâm dùng để lưu một khu vực địa lý cụ thể.

### Tạo AOI mới

1. Mở tab AOI.
2. Chọn kiểu vẽ:
   - Polygon.
   - Rectangle.
   - Circle.
3. Vẽ vùng trên bản đồ.
4. Nhập tên AOI.
5. Nhập mô tả nếu cần.
6. Bấm lưu.

Sau khi lưu, AOI được gửi tới backend. Backend tính diện tích và chu vi bằng
PostGIS rồi trả về kết quả. AOI mới sẽ xuất hiện trên bản đồ và trong danh sách.

### Chọn AOI

Trong danh sách AOI, bấm vào một AOI để chọn. Hệ thống hỗ trợ chọn nhiều AOI.
AOI được chọn sẽ được highlight và bản đồ có thể zoom tới vùng đó.

### Chỉnh sửa AOI

1. Chọn AOI cần sửa.
2. Bấm chế độ chỉnh sửa.
3. Kéo các điểm hoặc chỉnh hình trên bản đồ.
4. Lưu thay đổi.

Nếu geometry thay đổi, backend tính lại diện tích và chu vi.

### Xóa AOI

1. Chọn AOI.
2. Bấm xóa.
3. Xác nhận nếu UI yêu cầu.

Khi xóa AOI, backend cũng xóa các job và detection liên quan.

### Import AOI

1. Chuẩn bị file GeoJSON.
2. Mở tab AOI.
3. Chọn import.
4. Upload file.

Hệ thống hỗ trợ:

- FeatureCollection.
- Feature.
- Polygon trực tiếp.

Nếu file có nhiều feature, backend hiện lấy feature đầu tiên.

### Export AOI

1. Chọn AOI.
2. Bấm export.
3. Trình duyệt tải file GeoJSON.

File export có dạng GeoJSON Feature, gồm geometry và properties như id, name,
area, perimeter.

## 5. Đo đạc

### Đo khoảng cách

1. Mở tab đo đạc.
2. Chọn đo khoảng cách.
3. Bấm các điểm trên bản đồ để tạo đường.
4. Kết thúc thao tác vẽ.
5. Xem tổng khoảng cách và từng đoạn.

Kết quả hiển thị bằng mét hoặc kilomet.

### Đo diện tích

1. Mở tab đo đạc.
2. Chọn đo diện tích.
3. Vẽ polygon.
4. Xem diện tích, chu vi và độ dài từng cạnh.

Frontend dùng Turf.js để hiển thị nhanh. Backend có endpoint PostGIS để tính
chính xác hơn.

### Xóa lịch sử đo

Khi chuyển khỏi tab đo đạc hoặc đóng drawer, hệ thống có thể dọn trạng thái đo
hiện tại để tránh xung đột với AOI/STAC drawing.

## 6. Tìm kiếm STAC

1. Mở tab STAC.
2. Chọn collection.
3. Chọn khoảng thời gian.
4. Chọn vùng tìm kiếm:
   - bbox theo bản đồ,
   - polygon/rectangle/circle,
   - hoặc nhập filter có sẵn trong UI.
5. Bấm tìm kiếm.

Kết quả trả về danh sách item. Người dùng có thể chọn item để hiển thị overlay
hoặc giữ nhiều item trong danh sách đã chọn.

Lưu ý:

- Kết quả search được backend cache trong Redis 5 phút.
- Nếu dùng Planet API, cần `PLANET_API_KEY` hợp lệ.

## 7. AI Detection

### Chuẩn bị

Để chạy detection có ý nghĩa, nên có:

- AOI đã lưu.
- Worker đang chạy.
- Redis và RabbitMQ hoạt động.
- Model `.pt` trong `backend/services/ai/training/` nếu muốn inference thật.

Nếu thiếu model hoặc inference lỗi, hệ thống có thể dùng mock result.

### Chạy detection

1. Mở tab AI.
2. Chọn AOI cần phân tích.
3. Chọn collection nếu UI hỗ trợ.
4. Bấm chạy detection.
5. Theo dõi tiến trình trong jobs widget hoặc notification.

Các mốc tiến trình thường gặp:

- Trích xuất AOI.
- Tải ảnh vệ tinh.
- Khởi động model.
- Nhận diện từng lớp đối tượng.
- Lọc trùng và lọc theo ranh giới AOI.
- Hoàn thành.

### Xem kết quả

Khi job completed:

1. Frontend gọi API lấy detection result.
2. Bounding boxes được render trên bản đồ.
3. Người dùng có thể chọn object nếu UI hỗ trợ.

Các lớp kết quả:

- aircraft.
- ship.
- vehicle.

## 8. Theo dõi job realtime

Frontend tự kết nối WebSocket `/ws/jobs` khi load app. Nếu WebSocket hoạt động,
job progress sẽ cập nhật gần như tức thời.

Nếu WebSocket mất kết nối, frontend có polling fallback để cập nhật danh sách
job định kỳ.

## 9. Lỗi thường gặp

### API không phản hồi

Kiểm tra:

```bash
docker compose ps
docker compose logs -f backend
```

Mở:

```text
http://localhost:8000/health
```

### Không lưu được AOI

Nguyên nhân thường gặp:

- Chưa chạy migration.
- PostGIS chưa sẵn sàng.
- Geometry không phải Polygon.

Chạy:

```bash
docker compose exec backend alembic upgrade head
```

### Detection không chạy

Kiểm tra:

- Worker có chạy không.
- RabbitMQ có sẵn sàng không.
- Redis có sẵn sàng không.
- AOI id có hợp lệ không.

Xem log:

```bash
docker compose logs -f worker
```

### Planet tile/thumbnail lỗi

Kiểm tra `PLANET_API_KEY` trong `.env`. Nếu còn placeholder, endpoint Planet sẽ
không hoạt động.

