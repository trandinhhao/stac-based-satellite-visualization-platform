import os
import json
import math
import random
import logging
from io import BytesIO
from concurrent.futures import ThreadPoolExecutor

# Try importing ML libraries; fallback to mock if unavailable
try:
    import requests
    from PIL import Image
    from ultralytics import YOLO
    HAS_ML_LIBS = True
except ImportError:
    HAS_ML_LIBS = False

logger = logging.getLogger(__name__)

# Target classes for display
CLASSES = ["aircraft", "vehicle", "ship"]

# ── Model registry ──────────────────────────────────────────────────────────
# Each entry: (canonical_class, candidate_filenames, conf_threshold, imgsz, classes, target_zoom)
SPECIALIZED_MODELS = [
    {
        "class":        "aircraft",
        "files":        ["aircraft_best.pt", "aircraft.pt", "plane_best.pt", "airplane_best.pt", "airplane.pt"],
        "conf":         0.60,   # Set to 60% confidence threshold for balanced plane detection
        "imgsz":        1536,   # High resolution (1536x1536) for small planes
        "target_zoom":  18,
        "note":         "HRPlanes / CORS-ADD satellite airplane detection"
    },
    {
        "class":        "ship",
        "files":        ["ship_large_best.pt", "ship_best.pt", "hrsc_best.pt", "ship_hrsc.pt", "dota_ship.pt"],
        "conf":         0.20,   # 20% conf — balanced threshold for clean ship detection
        "iou":          0.45,   # Standard 0.45 IoU
        "imgsz":        1504,   # 1504x1504 resolution
        "target_zoom":  18,
        "note":         "HRSC2016 / Optical High-Resolution Large Cargo & Container Ships"
    },
    {
        "class":        "vehicle",
        "files":        ["vehicle_best.pt", "vehicle.pt", "car_best.pt", "geotrax_hbb_yolov8s_1920_v1.pt", "geotrax.pt"],
        "conf":         0.05,   # Low confidence threshold (5%) to maximize recall on tiny aerial vehicles
        "imgsz":        1920,   # Native Geo-trax 1920x1920 resolution
        "iou":          0.45,   # Official Geo-trax recommended IoU
        "classes":      [0, 1, 2],  # Strictly Car (0), Bus (1), Truck (2)
        "target_zoom":  19,     # Native Zoom 19 (~0.3m/px spatial resolution) directly from Google Satellite
        "upscale":      2,      # 2x Lanczos upscale on native Zoom 19 for 4096px 1:1 tiled window patch input
        "tiled":        True,   # 1:1 unscaled padding & sliding window patches
        "max_bbox_m":   12,     # Max bbox side in metres — car ~4.5m, bus ~12m; buildings typically larger
        "note":         "Geo-trax – Aerial / Satellite Vehicle Detector (679k annotations)"
    },
]

# ── Coordinate & Geometry helpers ────────────────────────────────────────────
def latlng_to_tile(lat: float, lng: float, zoom: int) -> tuple[int, int]:
    """Convert Lat/Lng coordinates to Slippy Map tile coordinates (x, y)."""
    lat_rad = math.radians(lat)
    n = 2.0 ** zoom
    xtile = int((lng + 180.0) / 360.0 * n)
    ytile = int((1.0 - math.log(math.tan(lat_rad) + (1.0 / math.cos(lat_rad))) / math.pi) / 2.0 * n)
    return xtile, ytile

def tile_to_latlng(x: int, y: int, zoom: int) -> tuple[float, float]:
    """Convert Slippy Map tile coordinates (x, y) back to Lat/Lng coordinates."""
    n = 2.0 ** zoom
    lon_deg = x / n * 360.0 - 180.0
    lat_rad = math.atan(math.sinh(math.pi * (1.0 - 2.0 * y / n)))
    lat_deg = math.degrees(lat_rad)
    return lat_deg, lon_deg

def get_aoi_bbox(geojson_geom: dict) -> list[float]:
    """
    Calculate bounding box [xmin, ymin, xmax, ymax] from GeoJSON Polygon coordinates.
    Fallback to a default bounding box in Hanoi if parsing fails.
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
        logger.error(f"Error calculating AOI bounding box: {e}")
        return [105.80, 21.02, 105.81, 21.03]

def calculate_iou(boxA: list, boxB: list) -> float:
    """Calculate Intersection over Union (IoU) between two bounding boxes [xmin, ymin, xmax, ymax]."""
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
    """Apply Non-Maximum Suppression (NMS) to eliminate duplicate bounding boxes across multi-scale / tiled runs.
    Same-class only: ships never suppress aircraft, vehicles never suppress ships, etc.

    iou_threshold can be a float (applied to all classes) or a dict mapping class name -> float,
    e.g. {"ship": 0.60, "vehicle": 0.45, "aircraft": 0.50} to use per-class thresholds.
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
    """Remove lower-priority class detections that heavily overlap with higher-priority ones.
    Priority order (highest → lowest): aircraft > ship > vehicle.

    Two suppression rules:
    1. IoU-based: lower-priority box overlaps >= cross_iou_threshold with a higher-priority box.
    2. Center-in-bbox: center point of a lower-priority box falls inside a higher-priority box.
       This handles vehicles detected on open water between ships even when no IoU overlap occurs.
    """
    if not detections:
        return []

    PRIORITY = {"aircraft": 3, "ship": 2, "vehicle": 1}  # aircraft > ship > vehicle

    def center_inside(det_bbox, ref_bbox) -> bool:
        """Return True if the centre of det_bbox lies inside ref_bbox."""
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
                # Rule 1: significant IoU overlap
                if calculate_iou(det["bbox"], kept["bbox"]) > cross_iou_threshold:
                    suppressed = True
                    break
                # Rule 2: vehicle center falls inside a ship/aircraft bbox
                #         (catches vehicles detected on open water near ships)
                if center_inside(det["bbox"], kept["bbox"]):
                    suppressed = True
                    break
        if not suppressed:
            keep.append(det)

    return keep


def apply_urban_ship_suppression(detections: list, vehicle_count_threshold: int = 4, search_radius_factor: float = 3.0) -> list:
    """Remove ship detections that are surrounded by a dense cluster of vehicles.

    Real ships exist on open water where there are NO vehicles nearby.
    Building rooftops misidentified as ships in cities will always be surrounded
    by many vehicles on adjacent roads.

    Algorithm:
      For each ship detection, expand its bounding box by `search_radius_factor`
      in all directions (relative to its own bbox size) and count how many
      vehicle detections have their CENTER inside that expanded search area.
      If the count >= `vehicle_count_threshold`, the 'ship' is almost certainly
      a building rooftop in an urban area — suppress it.

    Args:
        detections:              Full list of detections (all classes).
        vehicle_count_threshold: Min number of nearby vehicles to trigger suppression (default: 4).
        search_radius_factor:    How much to expand the ship bbox for the vehicle density search (default: 3x).
    """
    if not detections:
        return []

    ships    = [d for d in detections if d["object_class"] == "ship"]
    vehicles = [d for d in detections if d["object_class"] == "vehicle"]
    others   = [d for d in detections if d["object_class"] not in ("ship", "vehicle")]

    if not ships or not vehicles:
        return detections  # Nothing to cross-check

    def vehicle_center(v):
        b = v["bbox"]
        return ((b[0] + b[2]) / 2, (b[1] + b[3]) / 2)

    suppressed_ships = set()
    for i, ship in enumerate(ships):
        sb = ship["bbox"]
        # Compute bbox dimensions
        w = sb[2] - sb[0]
        h = sb[3] - sb[1]
        # Expand search area around ship bbox
        sx_min = sb[0] - w * search_radius_factor
        sx_max = sb[2] + w * search_radius_factor
        sy_min = sb[1] - h * search_radius_factor
        sy_max = sb[3] + h * search_radius_factor

        # Count vehicles whose center falls inside the expanded area
        nearby_vehicles = 0
        for v in vehicles:
            vcx, vcy = vehicle_center(v)
            if sx_min <= vcx <= sx_max and sy_min <= vcy <= sy_max:
                nearby_vehicles += 1
                if nearby_vehicles >= vehicle_count_threshold:
                    break  # No need to count further

        if nearby_vehicles >= vehicle_count_threshold:
            suppressed_ships.add(i)
            print(f"   🏙️  Urban ship suppression: removed ship bbox={[round(x, 5) for x in sb]} — surrounded by {nearby_vehicles} vehicles")

    kept_ships = [ship for i, ship in enumerate(ships) if i not in suppressed_ships]
    return others + kept_ships + vehicles

def apply_marine_vehicle_suppression(detections: list, ship_count_threshold: int = 1, search_radius_factor: float = 12.0) -> list:
    """Remove vehicle detections that are near ships on open water or at marine docks.

    On open water or at piers/docks, a 'vehicle' detection surrounded by ships is almost
    certainly a false positive (small docked boat, wake, anchor buoy, floating debris).

    Two-tier confidence logic:
      - Low-confidence vehicles  (conf < 0.25): suppressed if ≥1 ship is found within search_radius_factor × bbox size
      - Higher-confidence vehicles (conf ≥ 0.25): suppressed if ≥2 ships are found in the same radius

    Dense-cluster cap:
      If ≥6 vehicles overlap very tightly (avg IoU > 0.25 with each other), they almost certainly
      represent a boat or dock-equipment cluster mislabelled as vehicles. Keep only the top-3
      highest-confidence detections from that tight cluster.

    Args:
        detections:           Full list of all-class detections.
        ship_count_threshold: Min nearby ships required to suppress a low-conf vehicle (default: 1).
        search_radius_factor: How much to expand vehicle bbox for the ship density search (default: 12x).
    """
    if not detections:
        return []

    ships    = [d for d in detections if d["object_class"] == "ship"]
    vehicles = [d for d in detections if d["object_class"] == "vehicle"]
    others   = [d for d in detections if d["object_class"] not in ("ship", "vehicle")]

    if not vehicles:
        return detections

    # ── Part A: ship proximity suppression ──────────────────────────────────
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

            # Confidence-aware threshold: low-conf vehicles need only 1 nearby ship to be suppressed
            effective_threshold = ship_count_threshold if v["confidence"] < 0.25 else max(ship_count_threshold, 2)

            if nearby_ships >= effective_threshold:
                print(f"   🌊 Marine vehicle suppression: removed vehicle (conf={v['confidence']:.2f}) bbox={[round(x, 5) for x in vb]} — surrounded by {nearby_ships} ships")
            else:
                proximity_kept.append(v)
    else:
        proximity_kept = vehicles

    # ── Part B: dense cluster cap (boats/dock-equipment cluster) ────────────
    # Real vehicles on roads are spread out. If ≥6 vehicles overlap heavily with
    # each other (mutual IoU > 0.25), they're very likely all detecting the same
    # boat or pile of dock equipment. Keep only top-3 highest-confidence ones.
    if len(proximity_kept) >= 6:
        # Build a graph of tightly-overlapping vehicles
        n = len(proximity_kept)
        in_dense_cluster = [False] * n
        for i in range(n):
            count = 0
            for j in range(n):
                if i != j and calculate_iou(proximity_kept[i]["bbox"], proximity_kept[j]["bbox"]) > 0.25:
                    count += 1
            if count >= 5:  # Overlaps with at least 5 others → it's in a dense cluster
                in_dense_cluster[i] = True

        cluster_members = [v for v, flag in zip(proximity_kept, in_dense_cluster) if flag]
        non_cluster     = [v for v, flag in zip(proximity_kept, in_dense_cluster) if not flag]

        if len(cluster_members) >= 6:
            # Keep only the top-3 most confident vehicles from the dense cluster
            cluster_members.sort(key=lambda x: x["confidence"], reverse=True)
            kept_from_cluster = cluster_members[:3]
            removed_count = len(cluster_members) - 3
            print(f"   🚢 Dense cluster suppression: boat/dock cluster of {len(cluster_members)} vehicles → kept top 3 (removed {removed_count})")
            final_vehicles = non_cluster + kept_from_cluster
        else:
            final_vehicles = proximity_kept
    else:
        final_vehicles = proximity_kept

    return others + ships + final_vehicles


def suppress_contained_ship_boxes(detections: list, containment_threshold: float = 0.75) -> list:
    """If a ship bbox lies inside another larger ship bbox (intersection >= 75% of smaller box area),
    drop the inner duplicate ship box.
    """
    ships  = [d for d in detections if d["object_class"] == "ship"]
    others = [d for d in detections if d["object_class"] != "ship"]

    if len(ships) < 2:
        return detections

    # Sort ships by area descending (largest bbox first)
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

            # Compute intersection area
            inter_x1 = max(out_b[0], in_b[0])
            inter_y1 = max(out_b[1], in_b[1])
            inter_x2 = min(out_b[2], in_b[2])
            inter_y2 = min(out_b[3], in_b[3])
            inter_area = max(0.0, inter_x2 - inter_x1) * max(0.0, inter_y2 - inter_y1)

            # If >= 75% of inner_ship is contained inside outer_ship, drop inner_ship
            if (inter_area / in_area) >= containment_threshold:
                suppressed.add(id(inner_ship))
                print(f"   🚢 Contained ship suppression: removed inner duplicate ship bbox={[round(x, 5) for x in in_b]} (inside larger ship)")

    kept_ships = [s for s in ships if id(s) not in suppressed]
    return others + kept_ships


# ── Mock detection ───────────────────────────────────────────────────────────
def generate_mock_detections(geojson_geom: dict, class_filter: str = None) -> list[dict]:
    """
    Generate realistic-looking mock bounding boxes inside the AOI bounding box.
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
        else:  # vehicle
            w = random.uniform(0.00008, 0.00015)
            h = random.uniform(0.00008, 0.00015)

        detections.append({
            "object_class": obj_class,
            "class":        obj_class,
            "confidence":   round(random.uniform(0.78, 0.97), 2),
            "bbox":         [cx - w/2, cy - h/2, cx + w/2, cy + h/2]
        })

    return detections

# ── Tile download & stitching ────────────────────────────────────────────────
def download_and_stitch_satellite_image(
    xmin: float, ymin: float, xmax: float, ymax: float, target_zoom: int = 18
) -> tuple:
    """
    Download Google Satellite tiles covering the AOI and stitch them into one image.
    Supports up to 400 tiles for high detail.
    Returns: (stitched PIL Image, zoom, (min_x, min_y, max_x, max_y))
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
        zoom -= 1

    print(f"[Tile Stitcher] Zoom: {zoom} | Grid: {width_tiles}×{height_tiles} = {total_tiles} tiles")

    canvas_w = width_tiles  * 256
    canvas_h = height_tiles * 256
    stitched_img = Image.new("RGB", (canvas_w, canvas_h))

    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

    # Define job task for a single tile download
    def download_single_tile(session, tx, ty, z):
        tile_url = f"https://mt1.google.com/vt/lyrs=s&x={tx}&y={ty}&z={z}"
        try:
            r = session.get(tile_url, headers=headers, timeout=3)
            if r.status_code == 200:
                img = Image.open(BytesIO(r.content)).convert("RGB")
                return (tx, ty, img)
            else:
                logger.warning(f"Tile {tx},{ty}@{z} failed with status {r.status_code}")
        except Exception as e:
            logger.error(f"Tile {tx},{ty}@{z} failed: {e}")
        # Return fallback gray tile on failure
        return (tx, ty, Image.new("RGB", (256, 256), color=(60, 60, 60)))

    # Download tiles in parallel using a thread pool and connection pooling session
    downloaded_tiles = {}
    with requests.Session() as session:
        # Configure adapter connection pool size
        adapter = requests.adapters.HTTPAdapter(pool_connections=20, pool_maxsize=30)
        session.mount('https://', adapter)

        tasks = []
        for ty in range(min_y, max_y + 1):
            for tx in range(min_x, max_x + 1):
                tasks.append((tx, ty))

        print(f"[Tile Stitcher] Fetching {len(tasks)} tiles in parallel using ThreadPool...")
        with ThreadPoolExecutor(max_workers=16) as executor:
            futures = [executor.submit(download_single_tile, session, tx, ty, zoom) for tx, ty in tasks]
            for fut in futures:
                tx, ty, tile_img = fut.result()
                downloaded_tiles[(tx, ty)] = tile_img

    # Stitch all downloaded tiles on the main canvas
    for ty in range(min_y, max_y + 1):
        for tx in range(min_x, max_x + 1):
            tile_img = downloaded_tiles.get((tx, ty))
            if not tile_img:
                tile_img = Image.new("RGB", (256, 256), color=(60, 60, 60))
            px = (tx - min_x) * 256
            py = (ty - min_y) * 256
            stitched_img.paste(tile_img, (px, py))

    return stitched_img, zoom, (min_x, min_y, max_x, max_y)

# ── Main detection pipeline ──────────────────────────────────────────────────
def resolve_models(training_dir: str, class_filter: str = None) -> list[dict]:
    """
    Scan training_dir for specialized .pt files and return a list of model configs to run.
    Each item: {"path": str, "class": str, "conf": float, "imgsz": int|list, "classes": list|None, "tiled": bool, "target_zoom": int}
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
                    "max_bbox_m":  spec.get("max_bbox_m"),   # Optional size filter (metres) — filters buildings
                    "note":        spec["note"],
                })
                print(f"✅ Found specialized model [{cls}]: {fpath}")
                break
        else:
            print(f"⚠️  No specialized model found for [{cls}] — skipping.")

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
                    "note":        "Unified fallback model",
                })
                print(f"ℹ️  Using unified fallback model: {fp}")
                break
        else:
            models_to_run.append({
                "path":        "yolo26n.pt",
                "class":       None,
                "conf":        0.25,
                "imgsz":       640,
                "classes":     None,
                "tiled":       False,
                "target_zoom": 18,
                "note":        "Base yolo26n (no fine-tuning)",
            })
            print("ℹ️  No weights found. Downloading base yolo26n.pt …")

    return models_to_run


def predict_tiled_patches(model, stitched_img, imgsz: int = 1920, conf: float = 0.10, iou: float = 0.45, classes: list = None, overlap: int = 400) -> tuple:
    """
    Divide a large stitched satellite image into 1920x1920 sliding window patches
    or pad smaller canvases with black background without scaling/stretching.
    Returns: (list of YOLO result objects, list of (offset_x, offset_y) tuples)
    """
    img_w, img_h = stitched_img.size

    # If canvas is smaller than or equal to target imgsz, pad canvas with black background
    # so 1 pixel of tile = 1 pixel of model input (zero scaling/stretching distortion!)
    if img_w <= imgsz and img_h <= imgsz:
        padded_canvas = Image.new("RGB", (imgsz, imgsz), (0, 0, 0))
        padded_canvas.paste(stitched_img, (0, 0))

        predict_kwargs = {"source": padded_canvas, "imgsz": imgsz, "conf": conf, "iou": iou, "verbose": False}
        if classes is not None:
            predict_kwargs["classes"] = classes

        results = model.predict(**predict_kwargs)
        return results, [(0, 0)]

    # If canvas is larger than imgsz, use 1920x1920 sliding window patches
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

            # Pad edge patches if smaller than imgsz to preserve 1:1 scale
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

    print(f"[Tiled Inference] Split canvas ({img_w}×{img_h} px) into {len(crops_info)} 1:1 unscaled patches (size {imgsz}×{imgsz} px)")

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
    Download real Google Satellite imagery for the AOI, run fine-tuned
    YOLO models (supporting Tiled Patch Sliding-Window & NMS deduplication),
    and project detections back to Latitude/Longitude coordinates.

    Supports optional progress_callback(pct: int, message: str) for real-time WebSocket progress updates.

    Returns a list of dicts with keys: object_class, class, confidence, bbox
    """
    if not HAS_ML_LIBS:
        print("[Warning] ML libs not available. Falling back to Mock.")
        return generate_mock_detections(geojson_geom, class_filter)

    try:
        if progress_callback:
            progress_callback(15, "Xác định tọa độ vùng AOI...")

        # ── 1. AOI bounding box ──────────────────────────────────────────────
        bbox = get_aoi_bbox(geojson_geom)
        xmin, ymin, xmax, ymax = bbox
        print(f"AOI bbox → xmin={xmin:.5f}, ymin={ymin:.5f}, xmax={xmax:.5f}, ymax={ymax:.5f}")

        if progress_callback:
            progress_callback(25, "Đang tải ảnh vệ tinh Google Satellite...")

        # ── 2. Resolve models first to know desired target zoom ─────────────
        training_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "training")
        models_to_run = resolve_models(training_dir, class_filter)

        if not models_to_run:
            print("[Warning] No models resolved. Falling back to Mock.")
            return generate_mock_detections(geojson_geom, class_filter)

        # Cache stitched images per zoom level so each model uses its intended zoom & resolution
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
                print(f"Stitched canvas for Zoom {real_zoom}: {img.size[0]}×{img.size[1]} px")
            return stitched_cache[z]

        if progress_callback:
            progress_callback(35, "Bắt đầu khởi chạy các mô hình AI...")

        # ── 5. Run Inference for each model ─────────────────────────────────
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

            print(f"\n🔍 Running [{target_cls or 'all'}] model: {os.path.basename(model_path)}")
            print(f"   conf={conf_thresh}, imgsz={inference_sz}, classes={cls_filter}, tiling={use_tiling}, zoom={zoom}")

            model = YOLO(model_path)
            count_before = len(raw_detections)

            if use_tiling:
                # Sliding window 1920x1920 tiling for 1:1 pixel scale matching Hugging Face Space
                single_sz  = inference_sz[0] if isinstance(inference_sz, list) else inference_sz
                model_iou  = cfg.get("iou", 0.45)
                upscale_f  = cfg.get("upscale", 1)

                # Apply Lanczos upscale to simulate browser DPR=2 rendering
                # This makes 5-8px cars grow to 10-16px — within model's optimal detection range!
                infer_img = stitched_img
                if upscale_f > 1:
                    new_w = img_w * upscale_f
                    new_h = img_h * upscale_f
                    infer_img = stitched_img.resize((new_w, new_h), Image.LANCZOS)
                    print(f"   🔬 Upscaled {img_w}×{img_h} → {new_w}×{new_h} px (×{upscale_f} Lanczos)")

                results_list, offsets_list = predict_tiled_patches(
                    model, infer_img, imgsz=single_sz, conf=conf_thresh, iou=model_iou, classes=cls_filter
                )

                for r, (off_x, off_y) in zip(results_list, offsets_list):
                    for box in r.boxes:
                        cls_idx = int(box.cls[0])
                        conf    = float(box.conf[0])

                        obj_class = target_cls if target_cls else "vehicle"

                        if class_filter and obj_class != class_filter:
                            continue

                        px_min, py_min, px_max, py_max = box.xyxy[0].tolist()

                        # Scale back to original canvas coordinates (undo upscale)
                        px_min /= upscale_f
                        px_max /= upscale_f
                        py_min /= upscale_f
                        py_max /= upscale_f

                        # Ignore predictions that land inside the black padded area (beyond actual tile content)
                        if px_min >= img_w or py_min >= img_h:
                            continue

                        # Add patch offset (already in original scale)
                        px_min += off_x / upscale_f
                        px_max += off_x / upscale_f
                        py_min += off_y / upscale_f
                        py_max += off_y / upscale_f

                        # Clamp to actual stitched image bounds
                        px_min = max(0, min(img_w, px_min))
                        px_max = max(0, min(img_w, px_max))
                        py_min = max(0, min(img_h, py_min))
                        py_max = max(0, min(img_h, py_max))

                        min_lng = lng_left  + (px_min / img_w) * (lng_right - lng_left)
                        max_lng = lng_left  + (px_max / img_w) * (lng_right - lng_left)
                        max_lat = lat_top   - (py_min / img_h) * (lat_top - lat_bottom)
                        min_lat = lat_top   - (py_max / img_h) * (lat_top - lat_bottom)

                        # Reject oversized boxes (buildings falsely detected as vehicles)
                        max_bbox_m = cfg.get("max_bbox_m")
                        if max_bbox_m:
                            # 1 deg lat ≈ 111_000 m; 1 deg lng ≈ 111_000 * cos(lat) m
                            import math as _math
                            mid_lat = (min_lat + max_lat) / 2
                            lat_m = abs(max_lat - min_lat) * 111_000
                            lng_m = abs(max_lng - min_lng) * 111_000 * _math.cos(_math.radians(mid_lat))
                            if lat_m > max_bbox_m or lng_m > max_bbox_m:
                                continue  # Too large to be a vehicle — skip

                        raw_detections.append({
                            "object_class": obj_class,
                            "class":        obj_class,
                            "confidence":   round(conf, 4),
                            "bbox":         [min_lng, min_lat, max_lng, max_lat]
                        })
            else:
                # Direct multi-scale or single scale prediction
                model_iou = cfg.get("iou", 0.45)  # Use per-model IoU so adjacent ships aren't NMS'd away
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
            print(f"   → Found {count_found} {target_cls or 'objects'}")
            
            end_pct = 35 + int(((idx + 1) / total_models) * 45)
            if progress_callback:
                progress_callback(end_pct, f"Đã nhận diện xong [{cls_vn}] (tìm thấy {count_found})")

        if progress_callback:
            progress_callback(85, "Đang khử nhiễu NMS và phân tích chéo...")

        # ── 6. Apply same-class NMS to deduplicate multi-scale/tiled boxes ────
        nms_detections = apply_nms(raw_detections, iou_threshold={"ship": 0.40, "vehicle": 0.40, "aircraft": 0.45})

        # ── 6b. Contained Ship Suppression: if a ship bbox lies inside another ship bbox, drop the inner box
        clean_ship_detections = suppress_contained_ship_boxes(nms_detections, containment_threshold=0.75)

        # ── 7. Cross-class suppression: remove vehicle/aircraft boxes that heavily
        #       overlap with a higher-priority ship detection (ship > aircraft > vehicle)
        cross_detections = apply_cross_class_suppression(clean_ship_detections, cross_iou_threshold=0.30)

        # ── 7b. Urban ship suppression: remove ships surrounded by dense vehicle clusters.
        #        Real ships are on water (no vehicles nearby). Building rooftops misidentified
        #        as ships in cities will always have many vehicles on adjacent roads.
        urban_detections = apply_urban_ship_suppression(cross_detections, vehicle_count_threshold=4, search_radius_factor=3.0)

        # ── 7c. Marine vehicle suppression: remove vehicles surrounded by ships on open water.
        #        On water, a vehicle detection surrounded by ≥2 ships is almost always a
        #        false positive (ship wake, anchor line, waterway marking misdetected as a car).
        final_detections = apply_marine_vehicle_suppression(urban_detections, ship_count_threshold=2, search_radius_factor=5.0)
        print(f"\n✅ Detection Pipeline complete: Raw={len(raw_detections)} → NMS={len(nms_detections)} → Cross-class={len(cross_detections)} → Urban-ship={len(urban_detections)} → Marine-vehicle={len(final_detections)}")

        if progress_callback:
            progress_callback(92, "Đang lọc vật thể chính xác theo ranh giới AOI...")

        # ── 8. AOI containment filter ──────────────────────────────────────────
        # Satellite tiles always cover a wider area than the user-drawn AOI
        # (tiles are 256×256 px and can extend beyond AOI edges). This step
        # removes any detection whose CENTER point falls outside the actual
        # AOI polygon (not just the bounding box envelope) using the Ray Casting
        # algorithm — works for any polygon shape without external dependencies.

        # Extract the exterior ring from the geojson geometry
        _aoi_ring = geojson_geom.get("coordinates", [[]])[0]  # list of [lng, lat] pairs

        def _point_in_polygon(px: float, py: float, ring: list) -> bool:
            """
            Ray Casting algorithm for Point-in-Polygon test.
            Casts a horizontal ray from (px, py) to +infinity and counts
            how many times it crosses the polygon edges. Odd = inside.
            Works correctly for any convex or concave polygon shape.
            """
            inside = False
            n = len(ring)
            j = n - 1
            for i in range(n):
                xi, yi = ring[i][0], ring[i][1]
                xj, yj = ring[j][0], ring[j][1]
                # Check if the ray crosses the edge (xi,yi)-(xj,yj)
                if ((yi > py) != (yj > py)) and (px < (xj - xi) * (py - yi) / (yj - yi) + xi):
                    inside = not inside
                j = i
            return inside

        def _center_in_aoi(det_bbox) -> bool:
            cx = (det_bbox[0] + det_bbox[2]) / 2
            cy = (det_bbox[1] + det_bbox[3]) / 2
            # Fast bounding-box pre-check to skip points clearly outside envelope
            if not (xmin <= cx <= xmax and ymin <= cy <= ymax):
                return False
            # Precise polygon containment test on the actual drawn shape
            return _point_in_polygon(cx, cy, _aoi_ring)

        aoi_filtered = [d for d in final_detections if _center_in_aoi(d["bbox"])]
        print(f"   🗺️  AOI polygon filter: {len(final_detections)} → {len(aoi_filtered)} (removed {len(final_detections) - len(aoi_filtered)} outside AOI polygon)")

        return aoi_filtered

    except Exception as e:
        logger.error(f"YOLO inference failed: {e}", exc_info=True)
        print("[Error] Real detection failed. Falling back to Mock.")
        return generate_mock_detections(geojson_geom, class_filter)
