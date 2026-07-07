"""
Module xử lý nghiệp vụ tìm kiếm và ký tên ảnh vệ tinh STAC.
Hỗ trợ ký URL tài nguyên Azure của Microsoft Planetary Computer (MPC),
truy vấn dữ liệu từ Planet Labs API, và lọc hình học giao nhau chính xác.
"""

import hashlib
import json
import urllib.request
import urllib.parse
import os
import base64
from concurrent.futures import ThreadPoolExecutor
from .client import stac_client
from services.redis_cache import redis_cache

CACHE_TTL_SEARCH = 300  # Lưu cache kết quả tìm kiếm trong 5 phút
MPC_SEARCH_URL = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
MPC_SIGN_URL = "https://planetarycomputer.microsoft.com/api/sas/v1/sign"
PLANET_API_KEY = os.getenv("PLANET_API_KEY")

def hash_dict(d: dict) -> str:
    """
    Tạo mã MD5 hash từ dictionary để làm khóa (cache key) lưu trữ vào Redis.
    """
    s = json.dumps(d, sort_keys=True)
    return hashlib.md5(s.encode('utf-8')).hexdigest()

def sign_single_url(href: str) -> str:
    """
    Gửi yêu cầu ký mã xác thực SAS (Shared Access Signature) cho URL lưu trữ Azure Blob
    của Microsoft Planetary Computer để cho phép tải ảnh hoặc hiển thị lên bản đồ.
    """
    if not href or "blob.core.windows.net" not in href:
        return href
    try:
        url = f"{MPC_SIGN_URL}?href={urllib.parse.quote(href)}"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data.get("href", href)
    except Exception as e:
        print(f"[STAC] Lỗi khi ký tên cho URL {href}: {e}")
        return href

def sign_item_assets(item: dict) -> dict:
    """
    Ký các URL tài nguyên (visual, thumbnail) của một STAC Item.
    Hỗ trợ ánh xạ các băng tần ảnh thô về trường dữ liệu hiển thị tương thích với frontend.
    """
    assets = item.get("assets", {})
    collection = item.get("collection", "")
    
    # 1. Đồng bộ băng tần hiển thị chính
    if collection == "sentinel-2-l2a" and "visual" in assets:
        pass
    elif collection == "sentinel-1-grd" and "vv" in assets:
        # Ánh xạ băng tần VV của ảnh Radar làm ảnh hiển thị chính
        assets["visual"] = assets["vv"].copy()
        assets["visual"]["title"] = "SAR VV Band"
    elif collection == "landsat-c2-l2" and "red" in assets:
        # Ánh xạ băng tần Red làm ảnh hiển thị đen trắng cho Landsat
        assets["visual"] = assets["red"].copy()
        assets["visual"]["title"] = "Landsat Red Band (Grayscale)"
        
    # Ánh xạ ID bộ sưu tập Landsat gốc về ID tương thích với giao diện
    if collection == "landsat-c2-l2":
        platform = item.get("properties", {}).get("platform")
        if platform == "landsat-9":
            item["collection"] = "landsat-9-c2-l2"
        else:
            item["collection"] = "landsat-8-c2-l2"

    # 2. Tập hợp các URL cần ký tên
    urls_to_sign = []
    keys_to_update = []
    
    if "visual" in assets:
        urls_to_sign.append(assets["visual"].get("href", ""))
        keys_to_update.append(("visual", "href"))
        
    if "thumbnail" in assets:
        urls_to_sign.append(assets["thumbnail"].get("href", ""))
        keys_to_update.append(("thumbnail", "href"))

    # 3. Ký đồng thời các URL bằng ThreadPool để giảm độ trễ
    if urls_to_sign:
        with ThreadPoolExecutor(max_workers=5) as executor:
            signed_urls = list(executor.map(sign_single_url, urls_to_sign))
            
        for (asset_key, field_key), signed_url in zip(keys_to_update, signed_urls):
            assets[asset_key][field_key] = signed_url
            
    return item

def point_on_segment(p, a, b):
    """Kiểm tra xem điểm P có nằm trên đoạn thẳng AB hay không."""
    px, py = p
    ax, ay = a
    bx, by = b
    cross_product = (py - ay) * (bx - ax) - (px - ax) * (by - ay)
    if abs(cross_product) > 1e-9:
        return False
    return min(ax, bx) <= px <= max(ax, bx) and min(ay, by) <= py <= max(ay, by)

def point_in_polygon(x, y, poly):
    """Kiểm tra điểm (x, y) nằm trong đa giác đơn bằng thuật toán Ray Casting."""
    n = len(poly)
    inside = False
    p1x, p1y = poly[0]
    for i in range(n + 1):
        p2x, p2y = poly[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xints = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xints:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

def is_point_in_polygon(x, y, poly_rings):
    """Kiểm tra điểm có nằm trong đa giác (bao gồm cả các lỗ rỗng bên trong)."""
    if not poly_rings:
        return False
    outer_ring = poly_rings[0]
    for i in range(len(outer_ring)):
        if point_on_segment((x, y), outer_ring[i], outer_ring[(i + 1) % len(outer_ring)]):
            return True
    if not point_in_polygon(x, y, outer_ring):
        return False
    for hole in poly_rings[1:]:
        for i in range(len(hole)):
            if point_on_segment((x, y), hole[i], hole[(i + 1) % len(hole)]):
                return True
        if point_in_polygon(x, y, hole):
            return False
    return True

def ccw(A, B, C):
    """Kiểm tra chiều quay của 3 điểm (Counter-Clockwise)."""
    return (C[1] - A[1]) * (B[0] - A[0]) > (B[1] - A[1]) * (C[0] - A[0])

def intersect(A, B, C, D):
    """Kiểm tra xem hai đoạn thẳng AB và CD có cắt nhau hay không."""
    return ccw(A, C, D) != ccw(B, C, D) and ccw(A, B, C) != ccw(A, B, D)

def extract_polygons(geom):
    """Trích xuất danh sách đa giác từ định dạng hình học GeoJSON."""
    if not geom:
        return []
    g_type = geom.get("type")
    coords = geom.get("coordinates", [])
    if g_type == "Polygon":
        return [coords]
    elif g_type == "MultiPolygon":
        return coords
    return []

def geometry_contains(outer_geom, inner_geom):
    """
    Kiểm tra xem đa giác outer_geom có chứa hoàn toàn đa giác inner_geom hay không.
    Sử dụng thuật toán kiểm tra các điểm đỉnh và giao điểm các cạnh.
    """
    outer_polys = extract_polygons(outer_geom)
    inner_polys = extract_polygons(inner_geom)
    if not outer_polys or not inner_polys:
        return False
    for inner_poly in inner_polys:
        if not inner_poly:
            continue
        inner_outer_ring = inner_poly[0]
        for pt in inner_outer_ring:
            point_inside_any_outer = False
            for outer_poly in outer_polys:
                if is_point_in_polygon(pt[0], pt[1], outer_poly):
                    point_inside_any_outer = True
                    break
            if not point_inside_any_outer:
                return False
        for i in range(len(inner_outer_ring)):
            a = inner_outer_ring[i]
            b = inner_outer_ring[(i + 1) % len(inner_outer_ring)]
            for outer_poly in outer_polys:
                for ring in outer_poly:
                    for j in range(len(ring)):
                        c = ring[j]
                        d = ring[(j + 1) % len(ring)]
                        if intersect(a, b, c, d):
                            if a == c or a == d or b == c or b == d:
                                continue
                            return False
    return True

def search_stac_images(query_params: dict):
    """
    Thực hiện truy vấn tìm kiếm ảnh vệ tinh STAC từ Microsoft Planetary Computer, Planet,
    hoặc stac-fastapi cục bộ theo bộ lọc không gian và thời gian.
    """
    # 1. Chuẩn bị payload truy vấn
    payload = {}
    
    if "collections" in query_params:
        payload["collections"] = query_params["collections"]
    if "datetime" in query_params:
        payload["datetime"] = query_params["datetime"]
    if "bbox" in query_params:
        payload["bbox"] = query_params["bbox"]
    if "intersects" in query_params:
        payload["intersects"] = query_params["intersects"]
        
    requested_limit = query_params.get("limit", 15)
    # Tăng giới hạn lấy ảnh để lọc bao chứa sau khi tìm kiếm
    if "intersects" in query_params:
        payload["limit"] = 100
    else:
        payload["limit"] = requested_limit

    # 2. Kiểm tra cache trong Redis
    cache_key = f"stac_search_{hash_dict(payload)}"
    cached = redis_cache.get(cache_key)
    if cached:
        print(f"[Redis] Cache HIT kết quả tìm kiếm STAC: {cache_key}")
        return cached

    # 3. Phân tuyến nguồn dữ liệu
    requested_collections = payload.get("collections", [])
    is_global = any(col in ["sentinel-2-l2a", "sentinel-1-grd", "landsat-8-c2-l2", "landsat-9-c2-l2"] for col in requested_collections)
    is_planet = any(col == "PSScene" for col in requested_collections)

    try:
        if is_global:
            # Chuyển đổi tên vệ tinh Landsat sang ID tương thích của MPC
            mpc_collections = []
            landsat_platform = None
            for col in requested_collections:
                if col == "landsat-8-c2-l2":
                    mpc_collections.append("landsat-c2-l2")
                    landsat_platform = "landsat-8"
                elif col == "landsat-9-c2-l2":
                    mpc_collections.append("landsat-c2-l2")
                    landsat_platform = "landsat-9"
                else:
                    mpc_collections.append(col)
            payload["collections"] = mpc_collections

            if landsat_platform:
                if "query" not in payload:
                    payload["query"] = {}
                payload["query"]["platform"] = {"eq": landsat_platform}

            print(f"[Redis] Cache MISS, đang truy vấn Microsoft Planetary Computer...")
            req_data = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(
                MPC_SEARCH_URL,
                data=req_data,
                headers={'Content-Type': 'application/json'}
            )
            with urllib.request.urlopen(req) as resp:
                results = json.loads(resp.read().decode('utf-8'))
                
            # Lọc chỉ lấy các ảnh chứa hoàn toàn vùng đa giác người dùng vẽ
            if "intersects" in query_params and results.get("features"):
                filtered_features = []
                for feat in results["features"]:
                    feat_geom = feat.get("geometry")
                    if feat_geom and geometry_contains(feat_geom, query_params["intersects"]):
                        filtered_features.append(feat)
                results["features"] = filtered_features[:requested_limit]
                
            # Ký mã truy cập (SAS) song song cho các URL ảnh vệ tinh
            features = results.get("features", [])
            if features:
                print(f"[STAC] Ký SAS song song cho {len(features)} ảnh vệ tinh...")
                with ThreadPoolExecutor(max_workers=10) as executor:
                    results["features"] = list(executor.map(sign_item_assets, features))
        elif is_planet:
            print(f"[Redis] Cache MISS, đang truy vấn Planet STAC API...")
            if not PLANET_API_KEY or PLANET_API_KEY == "your_planet_api_key_here":
                raise Exception("Chưa cấu hình khóa PLANET_API_KEY trên máy chủ")
                
            auth_header = base64.b64encode(f"{PLANET_API_KEY}:".encode('utf-8')).decode('utf-8')
            payload["collections"] = ["PSScene"]
            
            req_data = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(
                "https://api.planet.com/x/data/search",
                data=req_data,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Basic {auth_header}',
                    'User-Agent': 'Mozilla/5.0'
                }
            )
            with urllib.request.urlopen(req) as resp:
                results = json.loads(resp.read().decode('utf-8'))
                
            if "intersects" in query_params and results.get("features"):
                filtered_features = []
                for feat in results["features"]:
                    feat_geom = feat.get("geometry")
                    if feat_geom and geometry_contains(feat_geom, query_params["intersects"]):
                        filtered_features.append(feat)
                results["features"] = filtered_features[:requested_limit]

            features = results.get("features", [])
            for item in features:
                if "assets" not in item:
                    item["assets"] = {}
                item["collection"] = "PSScene"
                item["assets"]["visual"] = {
                    "href": f"/api/v1/stac/planet/tiles/PSScene/{item['id']}/{{z}}/{{x}}/{{y}}.png",
                    "type": "image/png",
                    "title": "PlanetScope Visual"
                }
                orig_thumb = item["assets"].get("thumbnail", {}).get("href")
                if orig_thumb:
                    item["assets"]["thumbnail"] = {
                        "href": f"/api/v1/stac/planet/thumbnail/{item['id']}",
                        "type": "image/png",
                        "title": "PlanetScope Thumbnail"
                    }
        else:
            print(f"[Redis] Cache MISS, đang truy vấn stac-fastapi nội bộ...")
            results = stac_client.post("/search", payload)
            
            if "intersects" in query_params and results.get("features"):
                filtered_features = []
                for feat in results["features"]:
                    feat_geom = feat.get("geometry")
                    if feat_geom and geometry_contains(feat_geom, query_params["intersects"]):
                        filtered_features.append(feat)
                results["features"] = filtered_features[:requested_limit]

        # 4. Ghi kết quả tìm kiếm vào Redis Cache
        redis_cache.set(cache_key, results, CACHE_TTL_SEARCH)
        return results
    except Exception as e:
        print(f"Lỗi khi thực hiện tìm kiếm ảnh vệ tinh STAC: {e}")
        raise e

def get_stac_items_by_ids(ids: list[str]) -> list[dict]:
    """
    Truy vấn lấy siêu dữ liệu ảnh vệ tinh STAC chi tiết theo danh sách ID.
    Tìm kiếm lần lượt từ stac-fastapi nội bộ, MPC và Planet STAC.
    """
    features = []
    
    # 1. Tìm kiếm trong stac-fastapi cục bộ trước
    try:
        print(f"[STAC] Đang tìm kiếm các ID trong local stac-fastapi: {ids}")
        local_results = stac_client.post("/search", {"ids": ids})
        local_features = local_results.get("features", [])
        features.extend(local_features)
    except Exception as e:
        print(f"[STAC] Tìm kiếm theo ID tại local thất bại: {e}")

    # 2. Tìm kiếm các ID còn lại trên Microsoft Planetary Computer
    found_ids = {f.get("id") for f in features}
    remaining_ids = [i for i in ids if i not in found_ids]
    
    if remaining_ids:
        try:
            print(f"[STAC] Đang tìm kiếm các ID trên Microsoft Planetary Computer: {remaining_ids}")
            payload = {"ids": remaining_ids}
            req_data = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(
                MPC_SEARCH_URL,
                data=req_data,
                headers={'Content-Type': 'application/json'}
            )
            with urllib.request.urlopen(req) as resp:
                mpc_results = json.loads(resp.read().decode('utf-8'))
            
            mpc_features = mpc_results.get("features", [])
            if mpc_features:
                print(f"[STAC] Ký SAS xác thực cho {len(mpc_features)} ảnh từ MPC...")
                with ThreadPoolExecutor(max_workers=5) as executor:
                    signed_features = list(executor.map(sign_item_assets, mpc_features))
                features.extend(signed_features)
        except Exception as e:
            print(f"[STAC] Tìm kiếm theo ID tại MPC thất bại: {e}")

    # 3. Tìm kiếm các ID còn lại trên Planet STAC
    found_ids = {f.get("id") for f in features}
    remaining_ids = [i for i in ids if i not in found_ids]
    if remaining_ids and PLANET_API_KEY and PLANET_API_KEY != "your_planet_api_key_here":
        try:
            print(f"[STAC] Đang tìm kiếm các ID trên Planet: {remaining_ids}")
            payload = {"ids": remaining_ids, "collections": ["PSScene"]}
            auth_header = base64.b64encode(f"{PLANET_API_KEY}:".encode('utf-8')).decode('utf-8')
            req_data = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(
                "https://api.planet.com/x/data/search",
                data=req_data,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Basic {auth_header}',
                    'User-Agent': 'Mozilla/5.0'
                }
            )
            with urllib.request.urlopen(req) as resp:
                planet_results = json.loads(resp.read().decode('utf-8'))
            
            planet_features = planet_results.get("features", [])
            for item in planet_features:
                item["collection"] = "PSScene"
                if "assets" not in item:
                    item["assets"] = {}
                item["assets"]["visual"] = {
                    "href": f"/api/v1/stac/planet/tiles/PSScene/{item['id']}/{{z}}/{{x}}/{{y}}.png",
                    "type": "image/png",
                    "title": "PlanetScope Visual"
                }
                orig_thumb = item["assets"].get("thumbnail", {}).get("href")
                if orig_thumb:
                    item["assets"]["thumbnail"] = {
                        "href": f"/api/v1/stac/planet/thumbnail/{item['id']}",
                        "type": "image/png",
                        "title": "PlanetScope Thumbnail"
                    }
            features.extend(planet_features)
        except Exception as e:
            print(f"[STAC] Tìm kiếm theo ID tại Planet thất bại: {e}")
            
    return features
