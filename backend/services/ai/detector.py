"""
Module nhận diện đối tượng AI chuyên dụng bằng YOLO.
Hỗ trợ chia lưới ảnh vệ tinh lớn (Tiling), khử trùng lắp (NMS), phân tích chéo giữa các lớp đối tượng,
và lọc tọa độ chính xác nằm trong vùng đa giác AOI bằng thuật toán Ray-Casting.
"""

import os
import json
import math
import random
import logging
from io import BytesIO
from concurrent.futures import ThreadPoolExecutor

# Thử nhập các thư viện Machine Learning; nếu không có sẽ tự động chuyển sang chế độ giả lập (Mock)
try:
    import requests
    from PIL import Image
    from ultralytics import YOLO
    HAS_ML_LIBS = True
except ImportError:
    HAS_ML_LIBS = False

logger = logging.getLogger(__name__)

# Các lớp đối tượng mục tiêu để hiển thị lên bản đồ
CLASSES = ["aircraft", "vehicle", "ship"]

# ── Đăng ký các mô hình AI chuyên dụng ──────────────────────────────────────
# Mỗi cấu hình chứa: lớp đối tượng, tên file trọng số thực tế, ngưỡng tin cậy, kích thước ảnh đầu vào, và mức zoom mục tiêu.
SPECIALIZED_MODELS = [
    {
        "class":        "aircraft",
        "files":        ["airplane_best.pt"],
        "conf":         0.60,   # Ngưỡng tin cậy 60% cho máy bay để tránh nhận diện sai
        "imgsz":        1536,   # Kích thước ảnh lớn (1536x1536) để phát hiện máy bay nhỏ
        "target_zoom":  18,
        "note":         "Mô hình phát hiện máy bay chuyên dụng độ phân giải cao"
    },
    {
        "class":        "ship",
        "files":        ["ship_best.pt"],
        "conf":         0.20,   # Ngưỡng tin cậy 20% giúp bắt được nhiều tàu nhỏ/mờ
        "iou":          0.45,   # Ngưỡng IoU tiêu chuẩn 0.45 để loại bỏ trùng lặp gần nhau
        "imgsz":        1504,   # Kích thước ảnh 1504x1504
        "target_zoom":  18,
        "note":         "Mô hình phát hiện tàu biển chuyên dụng (HRSC2016)"
    },
    {
        "class":        "vehicle",
        "files":        ["vehicle_best.pt"],
        "conf":         0.05,   # Ngưỡng tin cậy thấp 5% để tăng tối đa độ phủ trên xe cộ siêu nhỏ từ vệ tinh
        "imgsz":        1920,   # Độ phân giải gốc 1920x1920 của mô hình Geo-trax
        "iou":          0.45,   # Ngưỡng IoU khuyến nghị 0.45
        "classes":      [0, 1, 2],  # Chỉ lọc lấy xe con (0), xe buýt (1), và xe tải (2)
        "target_zoom":  19,     # Zoom mục tiêu 19 (~0.3m/pixel) lấy trực tiếp từ Google Satellite
        "upscale":      2,      # Phóng đại 2x bằng thuật toán Lanczos trước khi chạy suy luận
        "tiled":        True,   # Sử dụng kỹ thuật cửa sổ trượt (sliding window) tỉ lệ 1:1 không co giãn
        "max_bbox_m":   12,     # Chiều dài tối đa của hộp nhận diện (mét) - xe con ~4.5m, xe buýt ~12m để lọc tòa nhà
        "note":         "Mô hình phát hiện xe cộ hàng không/vệ tinh Geo-trax"
    },
]

# ── Hàm bổ trợ tính toán tọa độ địa lý & hình học ──────────────────────────────────
def latlng_to_tile(lat: float, lng: float, zoom: int) -> tuple[int, int]:
    """
    Chuyển đổi tọa độ Vĩ độ/Kinh độ sang tọa độ tile slippy map (x, y).
    Sử dụng công thức chiếu Mercator toàn cầu.
    """
    lat_rad = math.radians(lat)
    n = 2.0 ** zoom
    xtile = int((lng + 180.0) / 360.0 * n)
    ytile = int((1.0 - math.log(math.tan(lat_rad) + (1.0 / math.cos(lat_rad))) / math.pi) / 2.0 * n)
    return xtile, ytile

def tile_to_latlng(x: int, y: int, zoom: int) -> tuple[float, float]:
    """
    Chuyển đổi tọa độ tile slippy map (x, y) ngược lại thành Vĩ độ/Kinh độ địa lý.
    """
    n = 2.0 ** zoom
    lon_deg = x / n * 360.0 - 180.0
    lat_rad = math.atan(math.sinh(math.pi * (1.0 - 2.0 * y / n)))
    lat_deg = math.degrees(lat_rad)
    return lat_deg, lon_deg

def get_aoi_bbox(geojson_geom: dict) -> list[float]:
    """
    Tính toán khung giới hạn [xmin, ymin, xmax, ymax] từ tọa độ đa giác GeoJSON.
    Nếu phân tích lỗi, trả về khung mặc định ở khu vực Hà Nội.
    """
    try:
        coords = geojson_geom.get("coordinates", [])
        if not coords or not coords[0]:
            return [105.80, 21.02, 105.81, 21.03]
        outer_ring = coords[0]
        lngs = [p[0] for p in outer_ring]
        lats = [p[1] for p in outer_ring]
        return [min(lngs), min(lats), max(lngs), max(lats)]
    except Exception as e:
        logger.error(f"Lỗi khi tính toán bounding box vùng AOI: {e}")
        return [105.80, 21.02, 105.81, 21.03]

def calculate_iou(boxA: list, boxB: list) -> float:
    """
    Tính chỉ số giao nhau trên tổng thể (IoU - Intersection over Union)
    giữa hai khung nhận diện [xmin, ymin, xmax, ymax].
    """
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    interArea = max(0.0, xB - xA) * max(0.0, yB - yA)
    if interArea == 0:
        return 0.0

    boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
    boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])

    iou = interArea / float(boxAArea + boxBArea - interArea)
    return iou

def apply_nms(detections: list, iou_threshold = 0.45) -> list:
    """
    Áp dụng thuật toán Khử cực đại phi (NMS - Non-Maximum Suppression) để loại bỏ
    các khung nhận diện trùng lặp giữa các kích thước hoặc ô lưới khác nhau.
    Chỉ so sánh khử trùng trên cùng một lớp đối tượng (ví dụ: tàu không khử máy bay).
    """
    if not detections:
        return []

    def _iou_for(cls: str) -> float:
        if isinstance(iou_threshold, dict):
            return iou_threshold.get(cls, 0.45)
        return iou_threshold

    sorted_dets = sorted(detections, key=lambda x: x["confidence"], reverse=True)
    keep = []

    for det in sorted_dets:
        overlap = False
        thresh = _iou_for(det["object_class"])
        for kept in keep:
            if det["object_class"] == kept["object_class"] and calculate_iou(det["bbox"], kept["bbox"]) > thresh:
                overlap = True
                break
        if not overlap:
            keep.append(det)

    return keep

def apply_cross_class_suppression(detections: list, cross_iou_threshold: float = 0.30) -> list:
    """
    Khử trùng lặp chéo lớp đối tượng: Loại bỏ các đối tượng có độ ưu tiên thấp hơn
    khi chúng bị chồng chéo nghiêm trọng với đối tượng có độ ưu tiên cao hơn.
    Thứ tự ưu tiên (cao -> thấp): máy bay (aircraft) > tàu thủy (ship) > xe cộ (vehicle).
    
    Quy tắc lọc:
    1. Chỉ số IoU giữa đối tượng ưu tiên thấp và cao vượt quá ngưỡng chéo.
    2. Điểm trung tâm của đối tượng ưu tiên thấp nằm hoàn toàn bên trong khung của đối tượng ưu tiên cao.
       Quy tắc này giúp lọc sạch xe cộ bị nhận diện sai trên mặt nước hoặc chồng lên thân tàu.
    """
    if not detections:
        return []

    PRIORITY = {"aircraft": 3, "ship": 2, "vehicle": 1}

    def center_inside(det_bbox, ref_bbox) -> bool:
        cx = (det_bbox[0] + det_bbox[2]) / 2
        cy = (det_bbox[1] + det_bbox[3]) / 2
        return ref_bbox[0] <= cx <= ref_bbox[2] and ref_bbox[1] <= cy <= ref_bbox[3]

    keep = []
    for det in detections:
        det_priority = PRIORITY.get(det["object_class"], 0)
        suppressed = False
        for kept in keep:
            kept_priority = PRIORITY.get(kept["object_class"], 0)
            if kept_priority > det_priority:
                if calculate_iou(det["bbox"], kept["bbox"]) > cross_iou_threshold:
                    suppressed = True
                    break
                if center_inside(det["bbox"], kept["bbox"]):
                    suppressed = True
                    break
        if not suppressed:
            keep.append(det)

    return keep

def apply_urban_ship_suppression(detections: list, vehicle_count_threshold: int = 4, search_radius_factor: float = 3.0) -> list:
    """
    Khử nhận diện nhầm tàu thủy trong đô thị (Urban Ship Suppression).
    Tàu thủy thực tế chỉ hoạt động dưới nước, xung quanh không có xe cộ lưu thông.
    Nếu một đối tượng 'tàu thủy' được bao quanh bởi mật độ xe cộ dày đặc, đó khả năng cao
    là một mái nhà hoặc công trình đô thị bị nhận diện nhầm.
    """
    if not detections:
        return []

    ships    = [d for d in detections if d["object_class"] == "ship"]
    vehicles = [d for d in detections if d["object_class"] == "vehicle"]
    others   = [d for d in detections if d["object_class"] not in ("ship", "vehicle")]

    if not ships or not vehicles:
        return detections

    def vehicle_center(v):
        b = v["bbox"]
        return ((b[0] + b[2]) / 2, (b[1] + b[3]) / 2)

    suppressed_ships = set()
    for i, ship in enumerate(ships):
        sb = ship["bbox"]
        w = sb[2] - sb[0]
        h = sb[3] - sb[1]
        
        # Mở rộng vùng tìm kiếm xung quanh tàu
        sx_min = sb[0] - w * search_radius_factor
        sx_max = sb[2] + w * search_radius_factor
        sy_min = sb[1] - h * search_radius_factor
        sy_max = sb[3] + h * search_radius_factor

        nearby_vehicles = 0
        for v in vehicles:
            vcx, vcy = vehicle_center(v)
            if sx_min <= vcx <= sx_max and sy_min <= vcy <= sy_max:
                nearby_vehicles += 1
                if nearby_vehicles >= vehicle_count_threshold:
                    break

        if nearby_vehicles >= vehicle_count_threshold:
            suppressed_ships.add(i)
            print(f"   🏙️  Urban ship suppression: Loại bỏ tàu nhầm tại đô thị {[round(x, 5) for x in sb]} - phát hiện {nearby_vehicles} xe xung quanh")

    kept_ships = [ship for i, ship in enumerate(ships) if i not in suppressed_ships]
    return others + kept_ships + vehicles

def apply_marine_vehicle_suppression(detections: list, ship_count_threshold: int = 1, search_radius_factor: float = 12.0) -> list:
    """
    Khử nhận diện nhầm xe cộ trên biển (Marine Vehicle Suppression).
    Xe cộ trên mặt nước hoặc cầu cảng thường là các điểm bọt nước, phao cứu sinh, hoặc ca nô nhỏ
    bị nhận diện sai. Lọc bỏ các xe cộ ở gần các tàu lớn.
    """
    if not detections:
        return []

    ships    = [d for d in detections if d["object_class"] == "ship"]
    vehicles = [d for d in detections if d["object_class"] == "vehicle"]
    others   = [d for d in detections if d["object_class"] not in ("ship", "vehicle")]

    if not vehicles:
        return detections

    def ship_center(s):
        b = s["bbox"]
        return ((b[0] + b[2]) / 2, (b[1] + b[3]) / 2)

    proximity_kept = []
    if ships:
        for v in vehicles:
            vb = v["bbox"]
            w = max(vb[2] - vb[0], 1e-9)
            h = max(vb[3] - vb[1], 1e-9)
            sx_min = vb[0] - w * search_radius_factor
            sx_max = vb[2] + w * search_radius_factor
            sy_min = vb[1] - h * search_radius_factor
            sy_max = vb[3] + h * search_radius_factor

            nearby_ships = 0
            for s in ships:
                scx, scy = ship_center(s)
                if sx_min <= scx <= sx_max and sy_min <= scy <= sy_max:
                    nearby_ships += 1

            # Lọc phân cấp theo độ tin cậy: Xe độ tin cậy thấp (<25%) chỉ cần 1 tàu bên cạnh để loại bỏ
            effective_threshold = ship_count_threshold if v["confidence"] < 0.25 else max(ship_count_threshold, 2)

            if nearby_ships >= effective_threshold:
                print(f"   🌊 Marine vehicle suppression: Loại bỏ xe trên biển (độ tin cậy={v['confidence']:.2f}) {[round(x, 5) for x in vb]} - xung quanh có {nearby_ships} tàu")
            else:
                proximity_kept.append(v)
    else:
        proximity_kept = vehicles

    # Giới hạn mật độ cụm dày đặc (ví dụ: bãi cảng hoặc lỗi cụm)
    if len(proximity_kept) >= 6:
        n = len(proximity_kept)
        in_dense_cluster = [False] * n
        for i in range(n):
            count = 0
            for j in range(n):
                if i != j and calculate_iou(proximity_kept[i]["bbox"], proximity_kept[j]["bbox"]) > 0.25:
                    count += 1
            if count >= 5:
                in_dense_cluster[i] = True

        cluster_members = [v for v, flag in zip(proximity_kept, in_dense_cluster) if flag]
        non_cluster     = [v for v, flag in zip(proximity_kept, in_dense_cluster) if not flag]

        if len(cluster_members) >= 6:
            cluster_members.sort(key=lambda x: x["confidence"], reverse=True)
            kept_from_cluster = cluster_members[:3]
            removed_count = len(cluster_members) - 3
            print(f"   🚢 Dense cluster suppression: Cụm thiết bị cảng {len(cluster_members)} xe -> Chỉ giữ lại 3 xe tin cậy nhất (loại bỏ {removed_count})")
            final_vehicles = non_cluster + kept_from_cluster
        else:
            final_vehicles = proximity_kept
    else:
        final_vehicles = proximity_kept

    return others + ships + final_vehicles

def suppress_contained_ship_boxes(detections: list, containment_threshold: float = 0.75) -> list:
    """
    Loại bỏ hộp tàu nhỏ nằm lọt bên trong hộp tàu lớn hơn (chứa nhau >= 75% diện tích hộp nhỏ).
    Giải quyết triệt để lỗi 1 con tàu bị nhận diện trùng 2-3 lần với các kích thước khác nhau.
    """
    ships  = [d for d in detections if d["object_class"] == "ship"]
    others = [d for d in detections if d["object_class"] != "ship"]

    if len(ships) < 2:
        return detections

    # Sắp xếp các tàu theo diện tích giảm dần (to nhất đứng trước)
    ships_by_area = sorted(ships, key=lambda s: (s["bbox"][2] - s["bbox"][0]) * (s["bbox"][3] - s["bbox"][1]), reverse=True)

    suppressed = set()
    for i, outer_ship in enumerate(ships_by_area):
        if id(outer_ship) in suppressed:
            continue
        out_b = outer_ship["bbox"]
        out_area = max(1e-9, (out_b[2] - out_b[0]) * (out_b[3] - out_b[1]))

        for j, inner_ship in enumerate(ships_by_area):
            if i == j or id(inner_ship) in suppressed:
                continue
            in_b = inner_ship["bbox"]
            in_area = max(1e-9, (in_b[2] - in_b[0]) * (in_b[3] - in_b[1]))

            if in_area >= out_area:
                continue

            # Tính toán diện tích phần giao nhau
            inter_x1 = max(out_b[0], in_b[0])
            inter_y1 = max(out_b[1], in_b[1])
            inter_x2 = min(out_b[2], in_b[2])
            inter_y2 = min(out_b[3], in_b[3])
            inter_area = max(0.0, inter_x2 - inter_x1) * max(0.0, inter_y2 - inter_y1)

            # Nếu diện tích giao nhau >= 75% diện tích hộp nhỏ, loại bỏ hộp nhỏ
            if (inter_area / in_area) >= containment_threshold:
                suppressed.add(id(inner_ship))
                print(f"   🚢 Contained ship suppression: Loại bỏ hộp tàu nhỏ trùng lặp bên trong tàu lớn {[round(x, 5) for x in in_b]}")

    kept_ships = [s for s in ships if id(s) not in suppressed]
    return others + kept_ships

# ── Hàm sinh dữ liệu giả lập (Mock) khi không có thư viện ML ─────────────────────────
def generate_mock_detections(geojson_geom: dict, class_filter: str = None) -> list[dict]:
    """
    Tự động sinh các hộp nhận diện giả lập trông như thật nằm trong ranh giới đa giác AOI.
    """
    bbox = get_aoi_bbox(geojson_geom)
    xmin, ymin, xmax, ymax = bbox

    classes = CLASSES
    if class_filter and class_filter in classes:
        classes = [class_filter]

    num_objects = random.randint(5, 14)
    detections = []

    for _ in range(num_objects):
        obj_class = random.choice(classes)
        cx = random.uniform(xmin, xmax)
        cy = random.uniform(ymin, ymax)

        if obj_class == "aircraft":
            w = random.uniform(0.00025, 0.0005)
            h = random.uniform(0.00025, 0.0005)
        elif obj_class == "ship":
            w = random.uniform(0.0003, 0.0006)
            h = random.uniform(0.00015, 0.0003)
        else:
            w = random.uniform(0.00008, 0.00015)
            h = random.uniform(0.00008, 0.00015)

        detections.append({
            "object_class": obj_class,
            "class":        obj_class,
            "confidence":   round(random.uniform(0.78, 0.97), 2),
            "bbox":         [cx - w/2, cy - h/2, cx + w/2, cy + h/2]
        })

    return detections

# ── Tải ảnh vệ tinh & ghép thành khung canvas ──────────────────────────
def download_and_stitch_satellite_image(
    xmin: float, ymin: float, xmax: float, ymax: float, target_zoom: int = 18
) -> tuple:
    """
    Tải các ô ảnh vệ tinh Google Satellite tương ứng với vùng AOI và ghép chúng lại
    thành một ảnh duy nhất. Khống chế tối đa 400 ô để bảo vệ tài nguyên bộ nhớ.
    Trả về: (ảnh PIL đã ghép, mức zoom thực tế, bounds của lưới ô ảnh)
    """
    zoom = target_zoom
    while True:
        x_start, y_start = latlng_to_tile(ymax, xmin, zoom)
        x_end,   y_end   = latlng_to_tile(ymin, xmax, zoom)

        min_x, max_x = min(x_start, x_end), max(x_start, x_end)
        min_y, max_y = min(y_start, y_end), max(y_start, y_end)

        width_tiles  = max_x - min_x + 1
        height_tiles = max_y - min_y + 1
        total_tiles  = width_tiles * height_tiles

        if total_tiles <= 400 or zoom <= 14:
            break
        zoom -= 1  # Hạ zoom nếu số ô vượt giới hạn để tải ảnh nhanh hơn

    print(f"[Tile Stitcher] Cấp Zoom: {zoom} | Lưới: {width_tiles}×{height_tiles} = {total_tiles} ô ảnh")

    canvas_w = width_tiles  * 256
    canvas_h = height_tiles * 256
    stitched_img = Image.new("RGB", (canvas_w, canvas_h))

    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

    def download_single_tile(session, tx, ty, z):
        tile_url = f"https://mt1.google.com/vt/lyrs=s&x={tx}&y={ty}&z={z}"
        try:
            r = session.get(tile_url, headers=headers, timeout=3)
            if r.status_code == 200:
                img = Image.open(BytesIO(r.content)).convert("RGB")
                return (tx, ty, img)
            else:
                logger.warning(f"Lỗi tải ô ảnh {tx},{ty}@{z}: HTTP {r.status_code}")
        except Exception as e:
            logger.error(f"Lỗi kết nối tải ô ảnh {tx},{ty}@{z}: {e}")
        # Trả về ô màu xám làm fallback nếu tải lỗi để không ngắt luồng ghép ảnh
        return (tx, ty, Image.new("RGB", (256, 256), color=(60, 60, 60)))

    downloaded_tiles = {}
    with requests.Session() as session:
        adapter = requests.adapters.HTTPAdapter(pool_connections=20, pool_maxsize=30)
        session.mount('https://', adapter)

        tasks = []
        for ty in range(min_y, max_y + 1):
            for tx in range(min_x, max_x + 1):
                tasks.append((tx, ty))

        print(f"[Tile Stitcher] Đang tải song song {len(tasks)} ô ảnh qua ThreadPool...")
        with ThreadPoolExecutor(max_workers=16) as executor:
            futures = [executor.submit(download_single_tile, session, tx, ty, zoom) for tx, ty in tasks]
            for fut in futures:
                tx, ty, tile_img = fut.result()
                downloaded_tiles[(tx, ty)] = tile_img

    # Ghép tất cả các ô ảnh vào khung canvas lớn
    for ty in range(min_y, max_y + 1):
        for tx in range(min_x, max_x + 1):
            tile_img = downloaded_tiles.get((tx, ty))
            if not tile_img:
                tile_img = Image.new("RGB", (256, 256), color=(60, 60, 60))
            px = (tx - min_x) * 256
            py = (ty - min_y) * 256
            stitched_img.paste(tile_img, (px, py))

    return stitched_img, zoom, (min_x, min_y, max_x, max_y)

# ── Suy luận mô hình ──────────────────────────────────────────────────────────
def resolve_models(training_dir: str, class_filter: str = None) -> list[dict]:
    """
    Quét thư mục training_dir để tìm các file trọng số chính xác được triển khai.
    Không tìm kiếm dự phòng tên file rác.
    """
    models_to_run = []

    for spec in SPECIALIZED_MODELS:
        cls = spec["class"]

        if class_filter and cls != class_filter:
            continue

        for fname in spec["files"]:
            fpath = os.path.join(training_dir, fname)
            if os.path.exists(fpath):
                models_to_run.append({
                    "path":        fpath,
                    "class":       cls,
                    "conf":        spec["conf"],
                    "imgsz":       spec["imgsz"],
                    "classes":     spec.get("classes"),
                    "tiled":       spec.get("tiled", False),
                    "upscale":     spec.get("upscale", 1),
                    "iou":         spec.get("iou", 0.45),
                    "target_zoom": spec.get("target_zoom", 18),
                    "max_bbox_m":  spec.get("max_bbox_m"),
                    "note":        spec["note"],
                })
                print(f"✅ Đã tìm thấy mô hình chuyên dụng [{cls}]: {fpath}")
                break
        else:
            print(f"⚠️  Không tìm thấy trọng số của lớp [{cls}] — Bỏ qua.")

    # Nếu không có mô hình chuyên dụng nào, tìm file best.pt mặc định
    if not models_to_run:
        fallback_candidates = [
            os.path.join(training_dir, "best.pt"),
            os.path.join(training_dir, "runs", "train", "weights", "best.pt"),
            os.path.join(os.path.dirname(training_dir), "best.pt"),
        ]
        for fp in fallback_candidates:
            if os.path.exists(fp):
                models_to_run.append({
                    "path":        fp,
                    "class":       None,
                    "conf":        0.25,
                    "imgsz":       640,
                    "classes":     None,
                    "tiled":       False,
                    "target_zoom": 18,
                    "note":        "Mô hình dự phòng mặc định",
                })
                print(f"ℹ️  Sử dụng mô hình dự phòng mặc định: {fp}")
                break
        else:
            # Fallback cuối cùng: tải yolo8/yolo11 mặc định từ ultralytics
            models_to_run.append({
                "path":        "yolo11n.pt",
                "class":       None,
                "conf":        0.25,
                "imgsz":       640,
                "classes":     None,
                "tiled":       False,
                "target_zoom": 18,
                "note":        "Mô hình nền yolo11n chưa tinh chỉnh",
            })
            print("ℹ️  Không tìm thấy trọng số. Đang tự động tải yolo11n.pt mặc định...")

    return models_to_run

def predict_tiled_patches(model, stitched_img, imgsz: int = 1920, conf: float = 0.10, iou: float = 0.45, classes: list = None, overlap: int = 400) -> tuple:
    """
    Chia nhỏ ảnh vệ tinh đã ghép thành các ô lưới cửa sổ trượt (sliding window) kích thước 1920x1920
    để suy luận trên mô hình với tỉ lệ 1:1 không bị co giãn méo hình.
    Trả về: (danh sách kết quả YOLO, danh sách tọa độ dịch offset_x, offset_y)
    """
    img_w, img_h = stitched_img.size

    # Nếu kích thước ảnh nhỏ hơn hoặc bằng 1920x1920, chỉ cần đệm nền đen cho đủ kích thước
    if img_w <= imgsz and img_h <= imgsz:
        padded_canvas = Image.new("RGB", (imgsz, imgsz), (0, 0, 0))
        padded_canvas.paste(stitched_img, (0, 0))

        predict_kwargs = {"source": padded_canvas, "imgsz": imgsz, "conf": conf, "iou": iou, "verbose": False}
        if classes is not None:
            predict_kwargs["classes"] = classes

        results = model.predict(**predict_kwargs)
        return results, [(0, 0)]

    step = imgsz - overlap
    crops_info = []

    y = 0
    while y < img_h:
        x = 0
        crop_h = min(imgsz, img_h - y)
        while x < img_w:
            crop_w = min(imgsz, img_w - x)
            crop_box = (x, y, x + crop_w, y + crop_h)
            crop_img = stitched_img.crop(crop_box)

            # Đệm viền đen cho các mảnh ô rìa ảnh để giữ nguyên tỉ lệ 1:1
            if crop_w < imgsz or crop_h < imgsz:
                padded_patch = Image.new("RGB", (imgsz, imgsz), (0, 0, 0))
                padded_patch.paste(crop_img, (0, 0))
                crop_img = padded_patch

            crops_info.append((crop_img, x, y))
            if x + crop_w >= img_w:
                break
            x += step
        if y + crop_h >= img_h:
            break
        y += step

    print(f"[Tiled Inference] Chia canvas lớn ({img_w}×{img_h} px) thành {len(crops_info)} mảnh ô lưới kích thước 1:1 ({imgsz}×{imgsz} px)")

    all_results = []
    all_offsets = []

    for crop_img, off_x, off_y in crops_info:
        predict_kwargs = {"source": crop_img, "imgsz": imgsz, "conf": conf, "iou": iou, "verbose": False}
        if classes is not None:
            predict_kwargs["classes"] = classes

        res = model.predict(**predict_kwargs)
        if res and len(res) > 0:
            all_results.append(res[0])
            all_offsets.append((off_x, off_y))

    return all_results, all_offsets

def run_real_detection(geojson_geom: dict, class_filter: str = None, progress_callback = None) -> list[dict]:
    """
    Luồng xử lý chính: Tải ảnh vệ tinh Google Satellite thực tế cho vùng AOI,
    chạy các mô hình YOLO được tinh chỉnh (hỗ trợ Tiled Cửa sổ trượt & NMS lọc chéo),
    và chuyển đổi ngược các tọa độ pixel về tọa độ Kinh độ/Vĩ độ địa lý.
    
    Hỗ trợ hàm phản hồi tiến độ `progress_callback(pct: int, message: str)` qua WebSocket.
    """
    if not HAS_ML_LIBS:
        print("[Cảnh báo] Thiếu thư viện ML. Chuyển sang chạy giả lập (Mock)...")
        return generate_mock_detections(geojson_geom, class_filter)

    try:
        if progress_callback:
            progress_callback(15, "Xác định tọa độ vùng AOI...")

        bbox = get_aoi_bbox(geojson_geom)
        xmin, ymin, xmax, ymax = bbox
        print(f"Khung AOI địa lý → xmin={xmin:.5f}, ymin={ymin:.5f}, xmax={xmax:.5f}, ymax={ymax:.5f}")

        if progress_callback:
            progress_callback(25, "Đang tải ảnh vệ tinh Google Satellite...")

        training_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "training")
        models_to_run = resolve_models(training_dir, class_filter)

        if not models_to_run:
            print("[Cảnh báo] Không tìm thấy mô hình. Chuyển sang chạy giả lập (Mock)...")
            return generate_mock_detections(geojson_geom, class_filter)

        # Lưu trữ cache các ảnh vệ tinh đã tải theo cấp Zoom để dùng chung nếu các mô hình trùng zoom
        stitched_cache = {}

        def get_stitched_for_zoom(z: int):
            if z not in stitched_cache:
                img, real_zoom, bounds = download_and_stitch_satellite_image(
                    xmin, ymin, xmax, ymax, target_zoom=z
                )
                min_x, min_y, max_x, max_y = bounds
                lat_top,    lng_left  = tile_to_latlng(min_x,     min_y,     real_zoom)
                lat_bottom, lng_right = tile_to_latlng(max_x + 1, max_y + 1, real_zoom)
                stitched_cache[z] = (img, real_zoom, bounds, (lat_top, lng_left, lat_bottom, lng_right))
                print(f"Đã ghép xong canvas cho cấp Zoom {real_zoom}: {img.size[0]}×{img.size[1]} px")
            return stitched_cache[z]

        if progress_callback:
            progress_callback(35, "Bắt đầu khởi chạy các mô hình AI...")

        raw_detections = []
        total_models = len(models_to_run)
        cls_label_map = {"aircraft": "Máy bay", "ship": "Tàu thủy", "vehicle": "Xe cộ"}

        for idx, cfg in enumerate(models_to_run):
            model_path   = cfg["path"]
            target_cls   = cfg["class"]
            conf_thresh  = cfg["conf"]
            inference_sz = cfg["imgsz"]
            cls_filter   = cfg.get("classes")
            use_tiling   = cfg.get("tiled", False)
            target_z     = cfg.get("target_zoom", 18)

            cls_vn = cls_label_map.get(target_cls, target_cls or "tổng hợp")
            start_pct = 35 + int((idx / total_models) * 45)
            if progress_callback:
                progress_callback(start_pct, f"Đang nhận diện đối tượng [{cls_vn}]...")

            stitched_img, zoom, tile_bounds, (lat_top, lng_left, lat_bottom, lng_right) = get_stitched_for_zoom(target_z)
            img_w, img_h = stitched_img.size

            print(f"\n🔍 Đang chạy mô hình [{target_cls or 'all'}]: {os.path.basename(model_path)}")
            print(f"   conf={conf_thresh}, imgsz={inference_sz}, classes={cls_filter}, tiling={use_tiling}, zoom={zoom}")

            model = YOLO(model_path)
            count_before = len(raw_detections)

            if use_tiling:
                single_sz  = inference_sz[0] if isinstance(inference_sz, list) else inference_sz
                model_iou  = cfg.get("iou", 0.45)
                upscale_f  = cfg.get("upscale", 1)

                # Phóng đại ảnh bằng thuật toán Lanczos để giả lập mật độ điểm ảnh DPR=2 của trình duyệt
                # Giúp phóng to xe cộ siêu nhỏ để mô hình nhận diện chính xác hơn
                infer_img = stitched_img
                if upscale_f > 1:
                    new_w = img_w * upscale_f
                    new_h = img_h * upscale_f
                    infer_img = stitched_img.resize((new_w, new_h), Image.LANCZOS)
                    print(f"   🔬 Phóng đại ảnh {img_w}×{img_h} → {new_w}×{new_h} px (×{upscale_f} Lanczos)")

                results_list, offsets_list = predict_tiled_patches(
                    model, infer_img, imgsz=single_sz, conf=conf_thresh, iou=model_iou, classes=cls_filter
                )

                for r, (off_x, off_y) in zip(results_list, offsets_list):
                    for box in r.boxes:
                        conf    = float(box.conf[0])
                        obj_class = target_cls if target_cls else "vehicle"

                        if class_filter and obj_class != class_filter:
                            continue

                        px_min, py_min, px_max, py_max = box.xyxy[0].tolist()

                        # Quy đổi ngược tỉ lệ ảnh gốc trước khi phóng đại
                        px_min /= upscale_f
                        px_max /= upscale_f
                        py_min /= upscale_f
                        py_max /= upscale_f

                        # Bỏ qua các khung nằm ngoài vùng giới hạn ảnh thực tế
                        if px_min >= img_w or py_min >= img_h:
                            continue

                        # Cộng offset của ô cửa sổ trượt tương ứng
                        px_min += off_x / upscale_f
                        px_max += off_x / upscale_f
                        py_min += off_y / upscale_f
                        py_max += off_y / upscale_f

                        # Ràng buộc tọa độ trong canvas
                        px_min = max(0, min(img_w, px_min))
                        px_max = max(0, min(img_w, px_max))
                        py_min = max(0, min(img_h, py_min))
                        py_max = max(0, min(img_h, py_max))

                        # Chuyển đổi tọa độ pixel sang Kinh độ/Vĩ độ
                        min_lng = lng_left  + (px_min / img_w) * (lng_right - lng_left)
                        max_lng = lng_left  + (px_max / img_w) * (lng_right - lng_left)
                        max_lat = lat_top   - (py_min / img_h) * (lat_top - lat_bottom)
                        min_lat = lat_top   - (py_max / img_h) * (lat_top - lat_bottom)

                        # Bộ lọc độ dài vật lý tối đa để loại bỏ các mái nhà/tòa nhà bị nhận diện sai thành xe cộ
                        max_bbox_m = cfg.get("max_bbox_m")
                        if max_bbox_m:
                            import math as _math
                            mid_lat = (min_lat + max_lat) / 2
                            lat_m = abs(max_lat - min_lat) * 111000
                            lng_m = abs(max_lng - min_lng) * 111000 * _math.cos(_math.radians(mid_lat))
                            if lat_m > max_bbox_m or lng_m > max_bbox_m:
                                continue  # Vượt độ dài tối đa của xe cộ -> Bỏ qua

                        raw_detections.append({
                            "object_class": obj_class,
                            "class":        obj_class,
                            "confidence":   round(conf, 4),
                            "bbox":         [min_lng, min_lat, max_lng, max_lat]
                        })
            else:
                # Dành cho mô hình không chia ô lưới
                model_iou = cfg.get("iou", 0.45)
                sizes = inference_sz if isinstance(inference_sz, list) else [inference_sz]
                for sz in sizes:
                    predict_kwargs = {"source": stitched_img, "imgsz": sz, "conf": conf_thresh, "iou": model_iou, "verbose": False}
                    if cls_filter is not None:
                        predict_kwargs["classes"] = cls_filter

                    results = model.predict(**predict_kwargs)

                    for r in results:
                        for box in r.boxes:
                            cls_idx = int(box.cls[0])
                            conf    = float(box.conf[0])

                            if target_cls:
                                obj_class = target_cls
                            else:
                                cls_name = model.names.get(cls_idx, "unknown").lower()
                                if any(k in cls_name for k in ("plane", "aircraft", "helicopter", "jet")):
                                    obj_class = "aircraft"
                                elif any(k in cls_name for k in ("ship", "boat", "vessel")):
                                    obj_class = "ship"
                                elif any(k in cls_name for k in ("vehicle", "car", "truck", "bus")):
                                    obj_class = "vehicle"
                                else:
                                    continue

                            if class_filter and obj_class != class_filter:
                                continue

                            px_min, py_min, px_max, py_max = box.xyxy[0].tolist()
                            min_lng = lng_left  + (px_min / img_w) * (lng_right - lng_left)
                            max_lng = lng_left  + (px_max / img_w) * (lng_right - lng_left)
                            max_lat = lat_top   - (py_min / img_h) * (lat_top - lat_bottom)
                            min_lat = lat_top   - (py_max / img_h) * (lat_top - lat_bottom)

                            raw_detections.append({
                                "object_class": obj_class,
                                "class":        obj_class,
                                "confidence":   round(conf, 4),
                                "bbox":         [min_lng, min_lat, max_lng, max_lat]
                            })

            count_found = len(raw_detections) - count_before
            print(f"   → Phát hiện được {count_found} đối tượng [{target_cls or 'chưa phân loại'}]")
            
            end_pct = 35 + int(((idx + 1) / total_models) * 45)
            if progress_callback:
                progress_callback(end_pct, f"Đã nhận diện xong [{cls_vn}] (tìm thấy {count_found})")

        if progress_callback:
            progress_callback(85, "Đang khử trùng lặp NMS và phân tích chéo...")

        # Lọc trùng lặp NMS trên từng lớp đối tượng
        nms_detections = apply_nms(raw_detections, iou_threshold={"ship": 0.40, "vehicle": 0.40, "aircraft": 0.45})

        # Khử các hộp tàu nhỏ bị nhận diện chồng chéo lọt trong tàu lớn
        clean_ship_detections = suppress_contained_ship_boxes(nms_detections, containment_threshold=0.75)

        # Lọc đè chéo lớp đối tượng theo thứ tự ưu tiên
        cross_detections = apply_cross_class_suppression(clean_ship_detections, cross_iou_threshold=0.30)

        # Bộ lọc khử tàu thủy nhầm trong thành phố
        urban_detections = apply_urban_ship_suppression(cross_detections, vehicle_count_threshold=4, search_radius_factor=3.0)

        # Bộ lọc khử xe cộ nhầm trên biển khơi
        final_detections = apply_marine_vehicle_suppression(urban_detections, ship_count_threshold=2, search_radius_factor=5.0)
        print(f"\n✅ Pipeline nhận diện hoàn thành: Gốc={len(raw_detections)} → NMS={len(nms_detections)} → Trùng chéo={len(cross_detections)} → Đô thị={len(urban_detections)} → Trên biển={len(final_detections)}")

        if progress_callback:
            progress_callback(92, "Đang lọc vật thể chính xác theo ranh giới đa giác AOI...")

        # ── Thuật toán lọc ranh giới đa giác chính xác (Ray-Casting) ────────────
        # Các ô tải ảnh vệ tinh thường mở rộng hơn nét vẽ đa giác của người dùng.
        # Đoạn này sẽ kiểm tra xem điểm trung tâm (center) của vật thể có nằm trong đa giác AOI hay không.
        _aoi_ring = geojson_geom.get("coordinates", [[]])[0]

        def _point_in_polygon(px: float, py: float, ring: list) -> bool:
            """
            Thuật toán Ray-Casting kiểm tra điểm nằm trong đa giác.
            """
            inside = False
            n = len(ring)
            j = n - 1
            for i in range(n):
                xi, yi = ring[i][0], ring[i][1]
                xj, yj = ring[j][0], ring[j][1]
                if ((yi > py) != (yj > py)) and (px < (xj - xi) * (py - yi) / (yj - yi) + xi):
                    inside = not inside
                j = i
            return inside

        def _center_in_aoi(det_bbox) -> bool:
            cx = (det_bbox[0] + det_bbox[2]) / 2
            cy = (det_bbox[1] + det_bbox[3]) / 2
            if not (xmin <= cx <= xmax and ymin <= cy <= ymax):
                return False
            return _point_in_polygon(cx, cy, _aoi_ring)

        aoi_filtered = [d for d in final_detections if _center_in_aoi(d["bbox"])]
        print(f"   🗺️  Lọc theo ranh giới đa giác AOI: {len(final_detections)} → {len(aoi_filtered)} (loại bỏ {len(final_detections) - len(aoi_filtered)} đối tượng nằm ngoài nét vẽ)")

        return aoi_filtered

    except Exception as e:
        logger.error(f"Lỗi hệ thống trong YOLO inference: {e}", exc_info=True)
        print("[Lỗi] Xử lý nhận diện thực tế thất bại. Chuyển sang giả lập (Mock).")
        return generate_mock_detections(geojson_geom, class_filter)
