# Đặc tả UI/UX

## 1. Định hướng thiết kế

Ứng dụng được thiết kế như một công cụ GIS vận hành trực tiếp, không phải một
landing page. Màn hình đầu tiên là bản đồ toàn màn hình, giúp người dùng bắt
đầu quan sát và thao tác ngay.

Phong cách giao diện:

- Tối, tập trung vào bản đồ.
- Panel nổi dạng bán trong suốt.
- Công cụ đặt quanh viền màn hình để không che khuất bản đồ.
- Ưu tiên thao tác nhanh bằng icon và panel chức năng.
- Thông tin kỹ thuật như tọa độ, zoom, job progress luôn sẵn sàng.

## 2. Bố cục chính

```text
+------------------------------------------------------+
| Left toolbar + drawer       Map             Status   |
|                                      Selected AOI    |
|                                      Selected STAC   |
|                                                      |
|                                                      |
| Layer switcher                         Jobs widget   |
+------------------------------------------------------+
```

Các khu vực:

- Map fullscreen.
- Navigation rail bên trái.
- Drawer panel mở rộng theo tab.
- Status bar góc phải trên.
- Indicator AOI/STAC đã chọn.
- Measurement floating card.
- Notification toast.
- Layer switcher góc trái dưới.
- Jobs widget góc phải dưới.

## 3. Navigation rail

Rail bên trái chứa các nhóm công cụ:

- Tìm kiếm địa điểm.
- Đo đạc.
- AOI.
- STAC.
- AI.

Mỗi nút gồm icon và label ngắn. Khi active, nút đổi màu để báo trạng thái. Khi
chuyển tab, drawer tự mở và một số state tạm được dọn để tránh xung đột giữa
các chế độ vẽ.

## 4. Drawer panel

Drawer có chiều rộng cố định, chứa nội dung theo tab. Thiết kế này giúp:

- Giữ bản đồ là vùng chính.
- Không phải chuyển route/page.
- Tập trung thao tác theo workflow.

Các panel được lazy-load:

- `STACSearchPanel`
- `AOIManagerPanel`
- `MeasurementPanel`
- `DetectionPanel`

Trong lúc tải panel, UI hiển thị loading nhỏ.

## 5. Bản đồ

MapViewer là trung tâm trải nghiệm. Các yêu cầu UX:

- Bản đồ không bị reload khi mở/đóng drawer.
- AOI hiển thị rõ và có trạng thái selected.
- Detection bounding box cần dễ phân biệt theo lớp đối tượng.
- Measurement label không che quá nhiều nội dung.
- Khi chọn AOI, bản đồ fit bounds với padding để tránh drawer che vùng cần xem.

## 6. AOI UX

AOI workflow cần rõ ràng:

1. Chọn kiểu vẽ.
2. Vẽ trên bản đồ.
3. Xem geometry tạm.
4. Nhập tên/mô tả.
5. Lưu hoặc hủy.

Trạng thái cần phân biệt:

- Đang vẽ.
- Đã vẽ nhưng chưa lưu.
- Đang chỉnh sửa.
- Đang chọn.
- Đang loading API.
- Lỗi.

AOI sau khi lưu nên hiển thị diện tích và chu vi theo đơn vị dễ đọc:

- m² hoặc km².
- m hoặc km.

## 7. Measurement UX

Đo đạc cần phản hồi nhanh. Frontend dùng Turf.js để hiển thị giá trị tức thời,
trong khi backend có thể tính lại bằng PostGIS.

Yêu cầu:

- Đo khoảng cách hiển thị tổng và từng đoạn.
- Đo diện tích hiển thị diện tích, chu vi và cạnh.
- Có nút dừng/hủy đo.
- Khi chuyển tab, dọn trạng thái đo để tránh để lại geometry tạm.

## 8. STAC Search UX

Panel STAC cần hỗ trợ workflow:

1. Chọn collection.
2. Chọn thời gian.
3. Chọn vùng tìm kiếm.
4. Submit.
5. Xem danh sách kết quả.
6. Chọn item để xem trên bản đồ.

Kết quả nên hiển thị:

- ID.
- Platform/collection.
- Datetime.
- Thumbnail nếu có.
- Hành động chọn/bỏ chọn.

Selected STAC item được hiển thị ở góc phải để người dùng biết lớp nào đang
được bật.

## 9. AI Detection UX

AI detection là workflow bất đồng bộ nên UI cần làm rõ trạng thái.

Các trạng thái:

- Chưa chọn AOI.
- Sẵn sàng chạy.
- Job queued.
- Job running.
- Job completed.
- Job failed.
- Job cancelled.

Khi job chạy, UI cần cho biết:

- Job id rút gọn hoặc tên AOI.
- Progress.
- Stage message.
- Lỗi nếu có.

Khi hoàn thành:

- Tự tải kết quả nếu phù hợp.
- Hiển thị bounding boxes.
- Cho phép clear detections khi rời tab AI.

## 10. Realtime notification

Notification realtime giúp người dùng biết hệ thống đang làm gì mà không cần
mở widget liên tục.

Thông báo nên ngắn:

- Job started.
- Progress stage.
- Completed.
- Failed.

Không nên spam quá nhiều thông báo nếu worker publish progress dày.

## 11. Responsive

Ứng dụng tối ưu cho desktop. Với viewport nhỏ:

- Drawer cần có khả năng thu gọn.
- Các panel cần scroll nội bộ.
- Text không được tràn khỏi button.
- Map vẫn phải chiếm phần lớn màn hình.

Hiện tại giao diện desktop là ưu tiên chính.

## 12. Các điểm UX cần cải thiện

- Tách rõ hơn trạng thái drawing/editing/saved.
- Thêm empty state thân thiện cho STAC/detection/job list.
- Thêm xác nhận trước khi xóa AOI hoặc hủy job.
- Thêm trạng thái mất WebSocket.
- Thêm filter/sort cho jobs.
- Thêm tooltip cho các icon ít quen thuộc.
- Tối ưu mobile nếu dự án cần dùng ngoài desktop.

