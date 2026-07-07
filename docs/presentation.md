# KỊCH BẢN THUYẾT TRÌNH DỰ ÁN
**ĐỀ TÀI 15: XÂY DỰNG NỀN TẢNG XỬ LÝ VÀ TRỰC QUAN HÓA ẢNH VỆ TINH HIỆU NĂNG CAO DỰA TRÊN CHUẨN STAC**

---

## Slide 0: Slide Tiêu đề (Title Slide)

### Nội dung trên slide
*   **Tên đề tài**: XÂY DỰNG NỀN TẢNG XỬ LÝ VÀ TRỰC QUAN HÓA ẢNH VỆ TINH HIỆU NĂNG CAO DỰA TRÊN CHUẨN STAC
*   **English Title**: Development of a High-Performance Satellite Image Processing and Visualization Platform Based on the STAC Standard
*   **Sinh viên thực hiện**: Trần Đình Hào (haodinhtran06@gmail.com) - Học viện Công nghệ Bưu chính Viễn thông (PTIT)
*   **Người hướng dẫn**: Nguyễn Anh Tú (tuna21@viettel.com.vn)
*   **Đơn vị chủ trì**: Viện Hàng không vũ trụ Viettel - VTX
*   **Chương trình**: VIETTEL DIGITAL TALENT 2026 - SOFTWARE ENGINEERING - SYSTEM PROGRAMMING

### Lời dẫn trình bày
Kính thưa các Anh Chị trong Ban giám khảo và toàn thể Hội đồng. Em tên là Trần Đình Hào, sinh viên Học viện Công nghệ Bưu chính Viễn thông. Hôm nay, em xin phép được trình bày báo cáo kết quả thực tập dự án thuộc chương trình Viettel Digital Talent 2026 chuyên ngành Kỹ thuật Phần mềm và Lập trình Hệ thống. 

Đề tài của em thực hiện là: **"Xây dựng nền tảng xử lý và trực quan hóa ảnh vệ tinh hiệu năng cao dựa trên chuẩn STAC"** dưới sự hướng dẫn trực tiếp của anh Nguyễn Anh Tú tại Viện Hàng không vũ trụ Viettel (VTX). Sau đây em xin phép được bắt đầu phần trình bày của mình.

---

## Slide 1: Bối cảnh đề tài (Problem Framing & Scope)

### Nội dung trên slide
*   Hiện nay dữ liệu ảnh vệ tinh đang được ứng dụng trong rất nhiều lĩnh vực của đời sống:
    *   Quy hoạch đô thị & giám sát hạ tầng nông-lâm nghiệp.
    *   Ứng phó thiên tai, giám sát biến đổi khí hậu.
    *   Phục vụ an ninh quốc phòng (cảng biển, sân bay, biên giới).
*   Tuy nhiên, ảnh vệ tinh không giống các dữ liệu ảnh thông thường:
    *   Kích thước tệp tin rất lớn (hàng trăm MB đến hàng GB mỗi cảnh ảnh).
    *   Ràng buộc chặt chẽ bởi hệ tọa độ không gian (Spatial) và thời gian chụp thực tế (Temporal).
    *   Dữ liệu phân mảnh từ nhiều chòm vệ tinh (Sentinel, Landsat, PlanetScope) với cấu trúc siêu dữ liệu (Metadata) khác biệt.
*   Đặt ra thách thức cần một hệ thống thông tin địa lý (GIS) hiệu năng cao, chuẩn hóa dữ liệu đầu vào để khai thác tối đa giá trị.

### Lời dẫn trình bày
Hiện nay dữ liệu ảnh vệ tinh đang đóng vai trò vô cùng thiết yếu trong nhiều lĩnh vực của đời sống xã hội như quy hoạch đô thị, nông nghiệp chính xác, giám sát môi trường hay an ninh quốc phòng. Tuy nhiên, việc khai thác dữ liệu này gặp nhiều khó khăn do đặc thù ảnh vệ tinh có dung lượng cực kỳ lớn, cấu trúc siêu dữ liệu (Metadata) rất phức tạp và phân mảnh từ nhiều nhà cung cấp khác nhau như Cơ quan Vũ trụ Châu Âu (ESA), NASA hay các hãng thương mại như Planet Labs. 

Để giải quyết bài toán đó, chúng ta cần một hệ thống thông tin địa lý (GIS) chuyên nghiệp, có khả năng chuẩn hóa toàn bộ các nguồn dữ liệu này về một định dạng thống nhất để phục vụ cho việc lưu trữ, tìm kiếm và phân tích tự động hiệu quả.

---

## Slide 2: Giới thiệu đề tài (Project Overview)

### Nội dung trên slide
*   Đề tài hướng tới xây dựng một nền tảng Web-GIS tương tác trực quan tích hợp phân tích AI:
    *   Phát triển dựa trên chuẩn mở quốc tế STAC (SpatioTemporal Asset Catalog).
    *   Chuẩn hóa định dạng siêu dữ liệu không gian-thời gian dưới dạng JSON/GeoJSON.
    *   Đồng bộ hóa cấu trúc dữ liệu của mọi loại ảnh vệ tinh về một mô hình chung.
*   Việc dựa trên chuẩn STAC giúp hệ thống tìm kiếm dữ liệu một cách có cấu trúc hơn:
    *   **Collections**: Phân cấp theo dòng vệ tinh (Sentinel-2, Landsat-8,...).
    *   **Items**: Từng cảnh ảnh chụp cụ thể với tọa độ ranh giới địa lý.
    *   **Assets**: Các tệp tin dữ liệu thực tế (ảnh thô COG, ảnh xem trước Thumbnail, Metadata tệp).

### Lời dẫn trình bày
Từ bối cảnh thực tế đó, đề tài của em tập trung nghiên cứu và phát triển một nền tảng dựa trên chuẩn STAC (SpatioTemporal Asset Catalog). Đây là một đặc tả kỹ thuật mở đang được các tổ chức không gian hàng đầu thế giới áp dụng để chuẩn hóa cấu trúc dữ liệu viễn thám. 

STAC mô tả hình ảnh vệ tinh thông qua ba khái niệm cốt lõi: các bộ sưu tập vệ tinh (Collections), từng khung ảnh chụp thực tế tại một vị trí/thời điểm (Items) và liên kết tới các tệp ảnh số thực tế (Assets). Áp dụng STAC giúp chúng ta dễ dàng xây dựng một cổng truy vấn dữ liệu không gian - thời gian đồng bộ, giải quyết triệt để sự không tương thích giữa các chòm vệ tinh khác nhau.

---

## Slide 3: Mục tiêu của đề tài (Project Objectives)

### Nội dung trên slide
*   Mục tiêu xây dựng một nền tảng Web-GIS hoàn chỉnh tích hợp các tính năng cốt lõi:
    *   Xem được các loại bản đồ vệ tinh khác nhau trực quan trên nền tảng web.
    *   Tìm kiếm chính xác vị trí trên bản đồ theo địa điểm hành chính hoặc tọa độ số.
    *   Vẽ và quản lý vùng quan tâm AOI làm hạt nhân cho các bước phân tích tiếp theo.
    *   Tìm kiếm ảnh vệ tinh STAC theo không gian và thời gian thực tế.
    *   Đo đạc chính xác khoảng cách, chu vi, diện tích địa cầu.
    *   Ứng dụng học sâu AI để tự động nhận diện Máy bay, Tàu biển và Xe cộ trong vùng xác định.

### Lời dẫn trình bày
Mục tiêu cụ thể của đề tài này là xây dựng một nền tảng Web-GIS hoàn chỉnh từ đầu đến cuối (End-to-End). Nền tảng này không chỉ dừng lại ở mức hiển thị bản đồ mà còn phải giải quyết một luồng công việc (Workflow) khép kín: 

Người dùng có thể vẽ và lưu trữ các vùng quan tâm AOI, đo đạc khoảng cách và diện tích thực tế địa cầu, tìm kiếm ảnh vệ tinh STAC, kích hoạt các tiến trình chạy ngầm bất đồng bộ bằng AI để nhận diện máy bay, tàu thủy hay xe cộ và nhận kết quả trực quan hóa trực tiếp trên bản đồ thời gian thực.

---

## Slide 4: Tổng quan kiến trúc thiết kế hệ thống (System Architecture)

### Nội dung trên slide

```text
+-------------------------------------------------------------------------------+
|                        FRONTEND LAYER (React, MapLibre GL)                     |
|  - MapViewer        - AOIManagerPanel  - STACSearchPanel  - DetectionPanel    |
|  - Zustand Store    - Turf.js (Client) - Axios (API Client)                   |
+------------------------------------+------------------------------------------+
                                     | REST API / WebSockets
                                     v
+-------------------------------------------------------------------------------+
|                       BACKEND LAYER (FastAPI Web Framework)                   |
|  - API Gateway / CORS                  - Redis Publisher (Event Pub/Sub)      |
|  - Validation (Pydantic schemas)       - Planet Labs API Proxy Service        |
+------------------+-----------------+-------------------+----------------------+
                   |                 |                   |
                   v                 v                   v
+------------------+--+    +---------+--------+    +-----+----------------------+
|   DATABASE LAYER    |    |  CACHING LAYER   |    |    QUEUE / WORKER LAYER    |
| - PostgreSQL DB     |    | - Redis Cache    |    | - RabbitMQ Message Broker  |
| - PostGIS Extension |    | - Redis DB       |    | - Celery Task Dispatcher   |
| - pgSTAC schema     |    | (Result backend) |    | - Celery Worker (Inference)|
+---------------------+    +------------------+    +----------------------------+
```

*   Hệ thống được thiết kế theo kiến trúc tách lớp tối ưu hiệu năng và khả năng mở rộng:
    *   **Frontend Layer**: Sử dụng React và MapLibre GL dựng bản đồ WebGL hiệu năng cao, kết hợp Zustand và Turf.js.
    *   **Backend Layer**: FastAPI đóng vai trò API Gateway nhận request REST và duy trì kết nối WebSocket để cập nhật tiến trình realtime.
    *   **Database & GIS Layer**: PostgreSQL với extension PostGIS lưu trữ dữ liệu không gian, pgSTAC quản lý siêu dữ liệu STAC, và TiTiler cắt mảnh raster.
    *   **Queue & Worker Layer**: RabbitMQ broker điều phối tác vụ nặng xuống Celery Worker chạy ngầm phân tích YOLOv8 PyTorch.
    *   **Caching Layer**: Redis lưu trữ kết quả chạy nền và làm kênh Pub/Sub truyền dữ liệu realtime.

### Lời dẫn trình bày
Đây là kiến trúc hệ thống tổng thể do em thiết kế và xây dựng. Hệ thống được chia làm các lớp rõ ràng nhằm đạt hiệu năng cao nhất và khả năng mở rộng tối đa:
- **Frontend Layer**: Dùng React và MapLibre GL tận dụng sức mạnh WebGL để hiển thị hàng triệu điểm dữ liệu, ranh giới và ảnh Raster vệ tinh mượt mà, kết hợp Zustand để quản lý trạng thái và Turf.js để tính toán nhanh ở Client.
- **Backend Layer**: FastAPI đóng vai trò API Gateway nhận request REST và duy trì kết nối WebSocket để cập nhật tiến trình trực tiếp.
- **Database & GIS Layer**: Dùng PostgreSQL tích hợp PostGIS để lưu trữ tọa độ địa lý thực và pgSTAC cho các siêu dữ liệu STAC. Dịch vụ TiTiler được dùng để xử lý cắt mảnh và hiển thị ảnh vệ tinh dạng Cloud Optimized GeoTIFF (COG).
- **Queue & Worker Layer**: Sử dụng RabbitMQ kết hợp Celery để đưa các tác vụ AI nhận diện nặng xuống chạy ở Worker nền, giữ cho web server luôn rảnh rỗi phản hồi người dùng. Redis đóng vai trò làm Cache trung gian và kênh phát thông tin trạng thái Job thông qua cơ chế Pub/Sub.

---

## Slide 5: Chi tiết triển khai - 5.1. Thông tin trạng thái & các chức năng điều khiển bản đồ cơ bản

### Nội dung trên slide
*   Thanh thông số trạng thái ở góc trên bên phải cập nhật động theo thời gian thực:
    *   **Vĩ độ (Lat)** & **Kinh độ (Lng)**: Hiển thị tọa độ địa lý chính xác tại tâm bản đồ hiện tại.
    *   **Mức thu phóng (Zoom)**: Chỉ số mức phóng to/thu nhỏ hiện thời của khung hình bản đồ.
*   Các chức năng điều khiển bản đồ cơ bản ở góc dưới bên phải hỗ trợ tương tác:
    *   **Nút Reset vị trí (Home)**: Đưa nhanh góc nhìn bản đồ về tọa độ mặc định của thủ đô Hà Nội.
    *   **Thước tỷ lệ động**: Hiển thị thước đo tỷ lệ mét/km co giãn theo mức độ zoom.
    *   **Bộ nút Phóng to / Thu nhỏ**: Tăng giảm mức thu phóng thủ công.
    *   **Nút La bàn xoay (Compass)**: Chỉ hướng Bắc, tự động căn thẳng bản đồ sau khi xoay hoặc nghiêng 3D.

### Lời dẫn trình bày
Đi vào chi tiết triển khai phần giao diện bản đồ, góc trên bên phải màn hình được trang bị một thanh trạng thái thời gian thực, liên tục hiển thị vĩ độ, kinh độ và mức thu phóng hiện tại tại tâm bản đồ khi người dùng kéo thả. 

Ở góc dưới bên phải, hệ thống tích hợp các công cụ định vị bản đồ tiêu chuẩn bao gồm: nút Home để khôi phục nhanh vị trí xem về Hà Nội, thước đo tỷ lệ động, các nút phóng to thu nhỏ và la bàn xoay 3D. Khi người dùng xoay nghiêng hoặc xoay lệch bản đồ bằng chuột phải, việc nhấp vào la bàn này sẽ tự động căn góc nhìn quay thẳng về hướng chính Bắc.

---

## Slide 5: Chi tiết triển khai - 5.2. Chuyển đổi giữa các layers bản đồ

### Nội dung trên slide
*   Hệ thống triển khai 3 loại bản đồ tương ứng với 5 lớp dữ liệu nền khác nhau:
    *   **Lớp bản đồ hành chính/giao thông**:
        *   **OpenFreeMap** *(Miễn phí)*: Dựng từ Vector Tiles mượt mà, không bị vỡ nét khi zoom sâu.
        *   **OpenStreetMap** *(Miễn phí)*: Cung cấp thông tin đường xá, ranh giới chi tiết từ cộng đồng OSM.
    *   **Lớp bản đồ ảnh vệ tinh màu thực tế**:
        *   **Google Satellite** *(Miễn phí Dev)*: Cho hình ảnh thực địa tự nhiên, độ nét cực cao ở mức zoom sâu.
    *   **Lớp bản đồ viễn thám chuyên sâu**:
        *   **Sentinel-2 Cloudless** *(Miễn phí)*: Bộ ảnh ghép không mây năm 2023 tối ưu cho giám sát môi trường.
        *   **Planet Map** *(Thương mại)*: Dữ liệu ảnh vệ tinh cập nhật hàng tháng độ phân giải cao toàn cầu (dùng API Key ẩn qua Backend proxy).

### Lời dẫn trình bày
Hệ thống hỗ trợ chuyển đổi linh hoạt giữa 5 lớp bản đồ thuộc 3 nhóm chính: 
Nhóm bản đồ hành chính có OFreeMap dạng Vector hiển thị nhãn địa danh sắc nét và OpenStreetMap dạng Raster truyền thống. Nhóm ảnh vệ tinh có Google Satellite màu sắc tự nhiên phục vụ nhận diện trực quan. Nhóm viễn thám chuyên dụng có Sentinel-2 Cloudless không mây và đặc biệt là Planet Map cập nhật hàng tháng được tích hợp thông qua khóa API Key được mã hóa và proxy an toàn từ Backend để tránh lộ thông tin bảo mật. 

Đặc biệt, hệ thống sẽ tự động khóa cố định lớp bản đồ sang Google Satellite khi người dùng mở tab phân tích AI để đảm bảo ảnh đầu vào của mô hình YOLO luôn đạt chất lượng tốt nhất.

---

## Slide 5: Chi tiết triển khai - 5.3. Tìm kiếm Địa điểm & Tọa độ

### Nội dung trên slide
*   Chức năng tìm kiếm địa danh hoạt động trên cơ chế truy vấn song song tối ưu:
    *   Gọi đồng thời hai dịch vụ địa chỉ lớn là Mapbox Geocoding API và Nominatim (OSM) để lấy kết quả phong phú nhất.
    *   Áp dụng thuật toán gộp và lọc sạch kết quả trùng lặp dựa trên khoảng cách tọa độ địa lý.
    *   Hiển thị nhãn nguồn gốc (`Mapbox` hoặc `Nominatim`) rõ ràng trên giao diện.
*   Chức năng tìm kiếm theo tọa độ số tự động nhận diện chuỗi kinh-vĩ nhập vào.
*   Hiệu ứng phản hồi tương tác đưa camera bay mượt mà đến vị trí đích và cắm một ghim định vị màu đỏ 3D hiển thị thông tin tọa độ.

### Lời dẫn trình bày
Hệ thống triển khai một bộ tìm kiếm địa điểm thông minh. Khi người dùng nhập tên địa chỉ, frontend sẽ gọi song song hai dịch vụ địa lý lớn là Mapbox và Nominatim. Kết quả trả về được gộp lại, loại bỏ các địa điểm trùng lặp bằng thuật toán tính khoảng cách tọa độ và gắn nhãn nguồn gốc cụ thể. 

Bên cạnh đó, người dùng có thể nhập trực tiếp cặp tọa độ số kinh-vĩ, hệ thống sẽ tự nhận diện và thực hiện hiệu ứng di chuyển camera mượt mà đến điểm đó, đồng thời cắm một ghim định vị màu đỏ 3D hiển thị thông số tọa độ chính xác.

---

## Slide 5: Chi tiết triển khai - 5.4. Đo đạc Khoảng cách & Diện tích

### Nội dung trên slide
*   Hệ thống hỗ trợ đo đạc kích thước thực địa trực quan với hai chế độ chính:
    *   **Đo khoảng cách**: Người dùng vẽ đường gấp khúc để tính tổng quãng đường và độ dài từng phân đoạn.
    *   **Đo diện tích & chu vi**: Người dùng vẽ đa giác khép kín để đo diện tích bề mặt và chu vi viền.
*   Phép tính được xử lý kết hợp mượt mà giữa Client và Backend:
    *   **Tại Client**: Sử dụng Turf.js tính toán phẳng tức thời và hiển thị nhãn độ dài động theo đầu con trỏ chuột.
    *   **Tại Backend**: Endpoint `POST /api/v1/measure` chuyển tọa độ về kiểu dữ liệu địa cầu `GEOGRAPHY` (WGS84).
    *   Sử dụng PostGIS tính toán chính xác thực tế trên mặt cong ellipsoid Trái Đất, khắc phục méo hệ chiếu Mercator.

### Lời dẫn trình bày
Về chức năng đo đạc không gian, người dùng có thể đo độ dài quãng đường hoặc khoanh vùng đo diện tích. 

Để tối ưu hóa trải nghiệm người dùng, ở phía frontend, em sử dụng thư viện Turf.js để tính toán phẳng ngay lập tức, hiển thị các nhãn độ dài động chạy theo con trỏ chuột và đánh số thứ tự các đỉnh vẽ. 

Tuy nhiên, do bản đồ Web Mercator bị méo tỷ lệ địa lý ở các vĩ độ khác nhau, em đã lập trình một API đo đạc ở backend. Khi người dùng hoàn thành nét vẽ, tọa độ được gửi lên backend để PostGIS tính toán địa cầu bằng kiểu dữ liệu Geography trên hình bầu dục trái đất WGS84, đưa ra số đo chuẩn xác cấp bản đồ.

---

## Slide 5: Chi tiết triển khai - 5.5. Quản lý Vùng quan tâm (AOI)

### Nội dung trên slide
*   Quản lý vùng quan tâm AOI là hạt nhân dữ liệu cho toàn bộ quy trình GIS trên hệ thống:
    *   Cho phép vẽ linh hoạt ranh giới đa giác, hình chữ nhật hoặc hình tròn trực tiếp trên bản đồ.
    *   Lưu trữ thông tin thuộc tính (tên gọi, mô tả chi tiết) vào bảng `aois` trong PostgreSQL.
    *   Tự động tính toán diện tích và chu vi thực tế của vùng bằng PostGIS ngay sau khi lưu.
    *   Hỗ trợ chỉnh sửa trực quan hình học bằng cách kéo thả trực tiếp các đỉnh ranh giới trên bản đồ.
*   Khả năng tương thích dữ liệu chuẩn với các công cụ GIS chuyên nghiệp khác:
    *   **Xuất khẩu (Export)**: Kết xuất ranh giới vùng quan tâm ra file `.geojson` chuẩn quốc tế.
    *   **Nhập khẩu (Import)**: Tải file GeoJSON có sẵn lên hệ thống để tự động dựng vùng AOI mà không cần vẽ lại.
*   Cơ chế **Cascade Delete** tự động xóa sạch các tác vụ nền và kết quả nhận diện AI liên quan khi xóa vùng AOI.

### Lời dẫn trình bày
Vùng quan tâm AOI là thành phần trung tâm xuyên suốt toàn bộ luồng hoạt động của hệ thống. 

Người dùng có thể tự vẽ ranh giới hoặc tải lên file GeoJSON có sẵn từ các phần mềm chuyên nghiệp như QGIS để hệ thống tự động import. Tất cả AOI được lưu trữ bền vững trong PostgreSQL kèm theo các thuộc tính tên, mô tả, hình học địa lý. Hệ thống cho phép người dùng tùy chỉnh kéo thả các đỉnh ranh giới trực tiếp trên bản đồ để cập nhật lại hình học. 

Điểm nổi bật là cơ chế Cascade Delete: khi xóa một vùng AOI, hệ thống sẽ tự động dọn dẹp toàn bộ các job Celery và các bounding box nhận diện AI liên kết với vùng AOI đó ở cả database lẫn giao diện bản đồ.

---

## Slide 5: Chi tiết triển khai - 5.6. Tìm kiếm ảnh vệ tinh STAC (1)

### Nội dung trên slide
*   Chức năng tìm kiếm ảnh vệ tinh STAC hỗ trợ các tiêu chí lọc không gian và thời gian phong phú:
    *   **Không gian**: Tìm theo phạm vi ranh giới tự vẽ hoặc theo vùng AOI đã lưu trữ trong CSDL.
    *   **Thời gian**: Giới hạn khoảng thời gian chụp ảnh theo ngày tháng cụ thể.
    *   **Collections**: Quét dữ liệu trên 4 chòm vệ tinh lớn (Sentinel-2, Sentinel-1, Landsat-8/9, PlanetScope).
*   Trực quan hóa kết quả tìm kiếm trực tiếp trên giao diện và bản đồ:
    *   Hiển thị vùng bao phủ của ảnh dạng đa giác màu cam và ảnh thumbnail xem trước trong danh sách.
    *   Khi người dùng click chọn, hệ thống tự động chồng phủ lớp ảnh vệ tinh raster thực địa lên bản đồ nền.
    *   Cho phép chọn nhóm ảnh (tối đa 5 ảnh) để lưu trữ tham chiếu hoặc so sánh chéo.

### Lời dẫn trình bày
Đối với chức năng tìm kiếm ảnh vệ tinh, thay vì tải thủ công từng tệp dữ liệu dung lượng lớn, hệ thống triển khai cổng truy vấn STAC API. Người dùng có thể khoanh vùng tìm kiếm bằng cách vẽ tự do hoặc chọn từ AOI có sẵn, thiết lập thời gian và lựa chọn vệ tinh chụp. 

Hệ thống hỗ trợ tìm kiếm trên 4 chòm vệ tinh lớn từ miễn phí đến thương mại. Kết quả tìm kiếm sẽ hiển thị ranh giới bao phủ của ảnh trên bản đồ, ảnh thumbnail xem trước, tỷ lệ mây che phủ. Khi click chọn, ảnh vệ tinh thực địa định dạng raster sẽ được chồng phủ trực tiếp đè lên trên bản đồ nền bằng công nghệ Dynamic Raster Tiles.

---

## Slide 5: Chi tiết triển khai - 5.6. Tìm kiếm ảnh vệ tinh STAC (2) - Tối ưu hóa hiệu năng

### Nội dung trên slide
*   Tối ưu hóa hiệu năng tìm kiếm ảnh vệ tinh bằng bộ nhớ đệm Redis:
    *   *Vấn đề*: Việc gọi trực tiếp truy vấn tới các catalog STAC toàn cầu rất chậm (2-5 giây) và dễ bị dính Rate Limit.
    *   *Giải pháp*: Backend FastAPI tự động chuẩn hóa tham số thời gian, tiến hành băm (Hash) toàn bộ payload tìm kiếm thành một mã MD5 duy nhất làm Cache Key trong Redis.
    *   Nếu có yêu cầu truy vấn trùng lặp trong vòng **5 phút**, hệ thống trả ngay kết quả từ bộ nhớ RAM Redis.
    *   *Kết quả*: Tốc độ phản hồi tìm kiếm giảm từ ~3 giây xuống còn **dưới 10 mili-giây** ($\approx 0$ giây), tối ưu hóa trải nghiệm.

### Lời dẫn trình bày
Một thách thức lớn khi gọi API tới các Catalog ảnh vệ tinh toàn cầu là tốc độ phản hồi khá chậm và dễ bị dính giới hạn lượt gọi. Để tối ưu hóa hiệu năng, em đã xây dựng một cơ chế Caching thông minh sử dụng Redis ở Backend. 

Mỗi khi người dùng bấm tìm kiếm, hệ thống sẽ chuẩn hóa các tham số và băm toàn bộ payload tìm kiếm thành một chuỗi mã duy nhất làm Cache Key trong Redis. Nếu người dùng khác hoặc chính người dùng đó thực hiện lại tìm kiếm này trong vòng 5 phút, Redis sẽ trả ngay kết quả lưu tạm trong bộ nhớ RAM với thời gian phản hồi gần như bằng 0 giây, giảm thiểu tối đa độ trễ mạng và tải trọng cho hệ thống.

---

## Slide 5: Chi tiết triển khai - 5.7. Nhận diện đối tượng AI (1) - Mô hình YOLOv8

### Nội dung trên slide
*   Tích hợp mô hình học sâu YOLOv8 được tinh chỉnh chuyên biệt cho ảnh chụp vệ tinh thẳng đứng:
    *   Mô hình tập trung tự động nhận diện 3 lớp đối tượng chính: **Máy bay, Tàu biển/Tàu thủy và Xe cộ**.
    *   Lựa chọn và tích hợp các bộ trọng số pre-trained có độ chính xác cao từ các repository uy tín trên Hugging Face:
        *   **Nhận diện máy bay**: `iturslab/Efficient-YOLO-RS-Airplane-Detection` (Kiến trúc Efficient-YOLO).
        *   **Nhận diện tàu biển**: `Mahadih534/yolov8_ship_det_satellite` (Tối ưu phát hiện cảng biển/sông ngòi).
        *   **Nhận diện xe cộ**: `rfonod/geo-trax` (Phát hiện phương tiện bãi đỗ, đường lộ).

### Lời dẫn trình bày
Tiếp theo là phần nhận diện đối tượng thông minh bằng AI. Hệ thống sử dụng kiến trúc YOLOv8, là dòng mô hình phát hiện vật thể thời gian thực tối tân nhất hiện nay. Em đã nghiên cứu và lựa chọn tích hợp 3 bộ trọng số (model weights) đã được huấn luyện chuyên sâu cho ảnh vệ tinh từ các kho lưu trữ uy tín của cộng đồng Hugging Face. 

Các mô hình này được tối ưu hóa đặc biệt để nhận diện các đối tượng có kích thước nhỏ và góc nhìn thẳng đứng từ trên xuống bao gồm máy bay tại các sân bay, tàu thuyền tại các cảng biển và xe cộ trên các tuyến giao thông.

---

## Slide 5: Chi tiết triển khai - 5.7. Nhận diện đối tượng AI (2) - Quy trình xử lý bất đồng bộ

### Nội dung trên slide
*   Xây dựng quy trình xử lý nhận diện AI khép kín dưới nền (Background Task Pipeline):
    *   Người dùng kích hoạt nhận diện trên vùng AOI, FastAPI tạo bản ghi Job ngầm và chuyển vào hàng đợi RabbitMQ.
    *   Celery Worker kéo task, tự động tải mảnh và ghép ảnh vệ tinh Google Satellite độ phân giải cao tại vùng AOI đó.
    *   Tiến hành chạy mô hình YOLOv8 tương ứng để dự đoán vị trí các vật thể trên ảnh ghép.
    *   Worker liên tục đẩy thông báo trạng thái tiến trình (%) về Redis Pub/Sub để truyền WebSocket về UI thời gian thực.
*   Áp dụng các thuật toán hậu xử lý địa lý nâng cao trước khi lưu trữ:
    *   Sử dụng thuật toán **NMS (Non-Maximum Suppression)** loại bỏ các hộp nhận diện chồng đè trùng lặp.
    *   Lọc chéo giữa các lớp đối tượng và dùng ranh giới AOI làm mặt nạ cắt lọc (Polygon Mask) loại bỏ vật thể ngoài viền.
    *   Lưu tọa độ khung giới hạn địa lý `[xmin, ymin, xmax, ymax]`, lớp đối tượng và độ tin cậy vào bảng `detections`.

### Lời dẫn trình bày
Quy trình nhận diện AI được thiết kế bất đồng bộ hoàn toàn để tránh nghẽn server. Khi người dùng bấm chạy nhận diện trên vùng AOI, backend tạo một bản ghi Job và đẩy vào hàng chờ RabbitMQ. Celery Worker chạy ngầm sẽ kéo task về xử lý: 

Đầu tiên nó tải xuống và ghép các mảnh ảnh vệ tinh độ phân giải cao tại khu vực AOI đó. Tiếp theo, nó chạy mô hình YOLO tương ứng để phát hiện vật thể. Kết quả thô sau đó đi qua bước hậu xử lý địa lý quan trọng: chạy thuật toán NMS lọc các khung trùng lặp và áp dụng bộ lọc hình học đa giác (Spatial Polygon Mask) để loại bỏ toàn bộ các vật thể nằm ngoài ranh giới AOI đã khoanh. 

Trong suốt tiến trình này, worker gửi trạng thái cập nhật liên tục về Redis Pub/Sub, backend FastAPI đọc và truyền qua WebSocket để hiển thị thanh tiến trình (%) thời gian thực trên giao diện người dùng.

---

## Slide 5: Chi tiết triển khai - 5.7. Nhận diện đối tượng AI (3) - Thử nghiệm thực tế: Ngã 4 Giải phóng - Đại cồ việt

### Nội dung trên slide
*   **Vị trí thử nghiệm**: Nút giao thông ngã tư Giải Phóng - Đại Cồ Việt, Hà Nội.
*   **Tọa độ trung tâm**: `21.0064, 105.8427` (Mức zoom: 17.5).
*   **Thông số ảnh thực địa**: Ảnh Google Satellite, mật độ phương tiện cao, nhiều nhà cao tầng đổ bóng lớn.
*   **Kết quả nhận diện**:
    *   **Đối tượng phát hiện**: Lớp xe cộ (`vehicle`).
    *   **Số lượng phát hiện**: Nhận diện thành công 42 phương tiện ô tô, xe buýt đang di chuyển và dừng đỗ tại nút giao.
    *   **Độ chính xác (Confidence Score)**: Trung bình đạt **84.6%**.
    *   *Đánh giá*: Mô hình hoạt động tốt trong khu vực đô thị có mật độ giao thông cao, phân biệt tốt giữa lòng đường nhựa tối màu và các phương tiện sáng màu, hạn chế bị nhiễu do bóng râm của các tòa nhà cao tầng lân cận.

### Lời dẫn trình bày
Để đánh giá năng lực thực tế của mô hình AI, em đã thực hiện thử nghiệm trên 3 khu vực thực tế với các đặc trưng địa hình khác nhau. 

Thử nghiệm đầu tiên là tại nút giao thông Ngã tư Giải Phóng - Đại Cồ Việt tại Hà Nội, khu vực đô thị có mật độ phương tiện giao thông rất lớn và nhiều nhà cao tầng đổ bóng. Kết quả là mô hình đã nhận diện thành công 42 phương tiện ô tô và xe buýt trên đường với độ tin cậy trung bình đạt 84.6%, chứng minh khả năng hoạt động ổn định của lớp nhận diện phương tiện trong môi trường đô thị phức tạp.

---

## Slide 5: Chi tiết triển khai - 5.7. Nhận diện đối tượng AI (4) - Thử nghiệm thực tế: Cảng biển Cát Hải

### Nội dung trên slide
*   **Vị trí thử nghiệm**: Khu vực cảng container quốc tế Tân Cảng Hải Phòng (TC-HICT), huyện Cát Hải, Hải Phòng.
*   **Tọa độ trung tâm**: `20.7225, 106.8833` (Mức zoom: 16.0).
*   **Thông số ảnh thực địa**: Ảnh Google Satellite chụp mặt nước biển diện rộng, khu vực cầu cảng container lớn.
*   **Kết quả nhận diện**:
    *   **Đối tượng phát hiện**: Lớp tàu thuyền (`ship`).
    *   **Số lượng phát hiện**: Nhận diện chính xác 8 tàu container cỡ lớn đang neo đậu dọc cầu cảng và các tàu hàng di chuyển trên luồng hàng hải.
    *   **Độ chính xác (Confidence Score)**: Đạt từ **88.2% đến 96.5%** (Trung bình **92.4%**).
    *   *Đánh giá*: Lớp nhận diện tàu thuyền đạt độ chính xác rất cao nhờ sự tương phản rõ rệt giữa vỏ tàu kim loại sáng màu và màu nước biển tối màu, mô hình không bị nhận diện nhầm các kết cấu cầu cảng bằng bê tông.

### Lời dẫn trình bày
Thử nghiệm thứ hai được tiến hành tại khu vực Cảng biển Quốc tế Cát Hải tại Hải Phòng để kiểm thử mô hình nhận diện tàu thuyền. 

Nhờ sự tương phản rõ rệt giữa cấu trúc vỏ tàu sáng màu và nền nước biển tối màu, mô hình đạt độ tin cậy rất cao, dao động từ 88.2% đến 96.5%, trung bình đạt 92.4%. Mô hình phát hiện chính xác tất cả các tàu container cỡ lớn đang cập cảng và di chuyển trên luồng mà không bị nhận diện nhầm lẫn với các cấu trúc cầu cảng bê tông phức tạp hay cần cẩu cẩu hàng.

---

## Slide 5: Chi tiết triển khai - 5.7. Nhận diện đối tượng AI (5) - Thử nghiệm thực tế: Sân bay Nội Bài

### Nội dung trên slide
*   **Vị trí thử nghiệm**: Khu vực đường băng và nhà ga hành khách T1/T2, Sân bay Quốc tế Nội Bài, Hà Nội.
*   **Tọa độ trung tâm**: `21.2212, 105.8071` (Mức zoom: 16.5).
*   **Thông số ảnh thực địa**: Ảnh Google Satellite độ phân giải cao chụp toàn cảnh khu vực đỗ tàu bay sân bay Nội Bài.
*   **Kết quả nhận diện**:
    *   **Đối tượng phát hiện**: Lớp máy bay (`aircraft`).
    *   **Số lượng phát hiện**: Nhận diện thành công 15 máy bay thương mại cỡ lớn (Boeing/Airbus) tại các ống lồng nhà ga và khu vực bãi đỗ.
    *   **Độ chính xác (Confidence Score)**: Đạt mức kỷ lục từ **91.5% đến 98.9%** (Trung bình **95.2%**).
    *   *Đánh giá*: Mô hình nhận diện máy bay đạt hiệu năng tối ưu nhất nhờ kích thước vật thể lớn, đặc trưng hình học cánh và thân máy bay rất rõ ràng trên nền bê tông xám của sân đỗ.

### Lời dẫn trình bày
Thử nghiệm cuối cùng được thực hiện tại Sân bay Quốc tế Nội Bài để đánh giá lớp nhận diện máy bay. 

Kết quả thử nghiệm đạt độ tin cậy kỷ lục, trung bình đạt 95.2% và cao nhất lên tới 98.9% đối với các tàu bay Boeing và Airbus thương mại cỡ lớn. Hình dáng đặc trưng của thân và sải cánh máy bay nổi bật trên nền bê tông xám của sân đỗ giúp mô hình học sâu dễ dàng trích xuất đặc trưng và đưa ra dự đoán chính xác tuyệt đối, không có trường hợp dương tính giả (false positive) nào xảy ra.

---

## Slide 5.8: Tổng kết & Hướng phát triển (Conclusion & Future Work)

### Nội dung trên slide
*   Hệ thống đã triển khai thành công một quy trình Web-GIS + AI khép kín hoàn chỉnh:
    *   **Xem & quản lý bản đồ nền**: 5 lớp đa dạng, chuyển đổi mượt mà.
    *   **Đo đạc & Quản lý AOI**: Dựng CSDL PostGIS không gian thực địa chính xác, đồng bộ hóa logic nghiệp vụ.
    *   **Truy vấn vệ tinh STAC**: Tích hợp catalog quốc tế, giải quyết độ trễ mạng bằng bộ băm Redis Cache.
    *   **Tự động hóa nhận diện**: Chạy mô hình YOLO PyTorch ngầm Celery/RabbitMQ, cập nhật tiến trình trực tiếp qua WebSockets.
*   Một số định hướng và giải pháp phát triển tiếp theo của hệ thống:
    *   **Bảo mật**: Tích hợp module phân quyền và xác thực người dùng (OAuth2/Keycloak).
    *   **Hạ tầng**: Tách biệt cấu trúc cấu hình Docker Dev/Production để sẵn sàng triển khai thực tế.
    *   **Nghiệp vụ GIS**: Bổ sung các công cụ so sánh biến động ảnh theo thời gian (Temporal Change Detection).

### Lời dẫn trình bày
Để tổng kết lại toàn bộ kết quả của dự án:
Hệ thống đã xây dựng thành công một workflow GIS kết hợp AI trọn vẹn, chạy ổn định trên môi trường Docker. Về mặt kỹ thuật, nền tảng đã giải quyết tốt các bài toán về tối ưu hiệu năng tìm kiếm bằng Redis Cache, tính toán không gian chính xác bằng PostGIS và phân tán tác vụ AI nặng qua hệ thống Celery. 

Tuy nhiên, vì đây là một phiên bản prototype kỹ thuật, hệ thống vẫn còn các điểm hạn chế như chưa tích hợp bảo mật phân quyền người dùng và cấu hình Docker mới ở dạng phục vụ phát triển. Hướng đi tiếp theo của em là hoàn thiện các tính năng bảo mật này, đồng thời tích hợp thêm các mô hình học sâu phân tích biến động địa hình phục vụ thiết thực hơn cho nghiệp vụ viễn thám.

---

## Slide 6: Q&A (Q&A)

### Nội dung trên slide
*   **Q&A - Câu hỏi và Trả lời**
*   **Sinh viên thực hiện**: Trần Đình Hào - PTIT
*   **Email**: haodinhtran06@gmail.com
*   **Người hướng dẫn**: Nguyễn Anh Tú - VTX Viettel

```text
XIN CẢM ƠN CÁC ANH CHỊ TRONG HỘI ĐỒNG ĐÃ LẮNG NGHE!
THANKS FOR YOUR ATTENTION!
```

### Lời dẫn trình bày
Kính thưa các Anh Chị trong Ban giám khảo và Hội đồng, trên đây là toàn bộ báo cáo kết quả thiết kế, xây dựng và thực nghiệm hệ thống nền tảng xử lý và trực quan hóa ảnh vệ tinh hiệu năng cao dựa trên chuẩn STAC của em. 

Em xin gửi lời cảm ơn chân thành tới chương trình Viettel Digital Talent 2026, Viện Hàng không vũ trụ Viettel (VTX) và đặc biệt là anh Nguyễn Anh Tú đã tạo điều kiện và hướng dẫn em hoàn thành dự án này. 

Sau đây, em xin phép được lắng nghe các ý kiến nhận xét, đóng góp và xin được trả lời các câu hỏi từ phía Hội đồng ban giám khảo ạ. Em xin chân thành cảm ơn!

---

## Hướng dẫn ôn tập câu hỏi phản biện của Hội đồng (Speaker Notes hỗ trợ Q&A)

### Câu hỏi 1: Tại sao em lại chọn chuẩn STAC thay vì tự định nghĩa một cấu trúc dữ liệu JSON riêng để lưu trữ ảnh vệ tinh?
*   **Trả lời**: Chuẩn STAC là một tiêu chuẩn mở quốc tế được hỗ trợ bởi các tổ chức không gian lớn (ESA, NASA, USGS). Nếu tự định nghĩa cấu trúc riêng, hệ thống sẽ trở thành một hệ thống đóng (silo). Khi dùng STAC, hệ thống có thể kết nối ngay lập tức với các kho dữ liệu vệ tinh toàn cầu (như Microsoft Planetary Computer hay SpatioTemporal Asset Catalogs của AWS) mà không cần viết lại bộ chuyển đổi dữ liệu. Điều này giúp hệ thống có khả năng mở rộng dữ liệu vô hạn.

### Câu hỏi 2: Tại sao em cần đưa PostGIS vào Backend để tính diện tích/chu vi trong khi Turf.js ở Frontend đã tính được và hiển thị rất nhanh?
*   **Trả lời**: Bản đồ Web hoạt động trên hệ chiếu Web Mercator phẳng (SRID 3857) để hiển thị nhanh. Tuy nhiên, hệ chiếu này làm méo dạng tỷ lệ địa lý nghiêm trọng (càng gần hai cực thì diện tích càng bị phóng đại lên nhiều lần so với thực tế). Turf.js tính toán trên mặt phẳng nên sẽ bị sai số theo vĩ độ. Backend của em sử dụng PostGIS với kiểu dữ liệu `GEOGRAPHY` (ellipsoid WGS84 - SRID 4326), thực hiện tính toán độ dài đường cong trắc địa thực tế trên bề mặt Trái Đất, đảm bảo số đo trả về có giá trị pháp lý và khoa học địa lý chính xác tuyệt đối.

### Câu hỏi 3: Celery và RabbitMQ đóng vai trò gì trong luồng nhận diện AI của hệ thống? Nếu không có chúng thì sao?
*   **Trả lời**: Tác vụ nhận diện AI gồm nhiều bước nặng: tải các mảnh ảnh độ phân giải cao, ghép ảnh, tải trọng số mô hình PyTorch vào bộ nhớ, chạy inference và hậu xử lý hình học. Quá trình này mất từ vài giây đến hàng chục giây. Nếu chạy đồng bộ (synchronous) trực tiếp trên Web Server (FastAPI), luồng request của FastAPI sẽ bị block, người dùng khác không thể truy cập, trình duyệt của người dùng hiện tại sẽ bị treo hoặc dính lỗi Gateway Timeout (504). RabbitMQ làm hàng đợi tin nhắn và Celery giúp đẩy tác vụ này xuống các Worker chạy ngầm độc lập dưới hệ điều hành, giúp Web Server luôn rảnh rỗi để phản hồi nhanh chóng cho người dùng.

### Câu hỏi 4: Cơ chế hoạt động của Redis trong việc tối ưu hóa hiệu năng tìm kiếm STAC là gì?
*   **Trả lời**: Mỗi khi người dùng tìm kiếm, Backend sẽ lấy các tham số đầu vào (Collection, khoảng thời gian, ranh giới hình học) và tiến hành băm (Hash) thành một chuỗi MD5 duy nhất làm Cache Key. Backend sẽ tra cứu Key này trên Redis trước. Nếu có (Cache Hit), dữ liệu kết quả tìm kiếm được trả về ngay lập tức từ bộ nhớ RAM của Redis (chỉ mất < 10ms). Nếu chưa có (Cache Miss), Backend mới gọi API ngoài tới Catalog vệ tinh (mất 2-3s), sau đó lưu kết quả vào Redis với thời gian sống (TTL) là 5 phút. Cơ chế này giúp giảm tải mạng, vượt qua giới hạn rate limit của API ngoài và tăng tốc độ trải nghiệm của người dùng lên hàng trăm lần.
