"""
Module quản lý các bộ sưu tập STAC Collections.
Hỗ trợ lấy danh sách các vệ tinh mẫu và bổ sung các bộ sưu tập bổ sung từ stac-fastapi cục bộ.
"""

from .client import stac_client
from services.redis_cache import redis_cache

CACHE_KEY_COLLECTIONS = "stac_collections_cache"
CACHE_TTL_COLLECTIONS = 3600  # Thời gian hết hạn cache là 1 giờ

def get_stac_collections():
    """
    Trả về danh sách các bộ sưu tập ảnh vệ tinh (Sentinel-2, Sentinel-1, Landsat-8, Landsat-9, PlanetScope).
    Tự động truy cập cache Redis trước, nếu chưa có sẽ gọi API để lấy và ghi cache lại.
    """
    # 1. Thử lấy dữ liệu từ cache Redis
    cached = redis_cache.get(CACHE_KEY_COLLECTIONS)
    if cached:
        print("[Redis] Đã tìm thấy danh sách Collections từ Cache")
        return cached

    print("[Redis] Chưa có cache danh sách Collections, tiến hành truy vấn stac-fastapi...")
    
    # Danh sách các bộ sưu tập mặc định luôn khả dụng trong dropdown chọn
    standard_collections = [
        {"id": "sentinel-2-l2a", "title": "Sentinel-2 L2A (Toàn cầu - MPC)"},
        {"id": "sentinel-1-grd", "title": "Sentinel-1 GRD (Toàn cầu - MPC)"},
        {"id": "landsat-8-c2-l2", "title": "Landsat-8 C2 L2 (Toàn cầu - MPC)"},
        {"id": "landsat-9-c2-l2", "title": "Landsat-9 C2 L2 (Toàn cầu - MPC)"},
        {"id": "PSScene", "title": "PlanetScope (Planet.com)"}
    ]

    # 2. Truy vấn stac-fastapi nội bộ để bổ sung thêm các bộ sưu tập tự nhập (nếu có)
    try:
        data = stac_client.get("/collections")
        collections = data.get("collections", [])
        
        for col in collections:
            col_id = col.get("id")
            # Bỏ qua các ID thử nghiệm hoặc ID đã tồn tại trong danh sách mặc định
            if col_id in ["planetscope-ortho", "test-collection", "sentinel-2-l2a", "sentinel-1-grd", "landsat-8-c2-l2", "landsat-9-c2-l2", "PSScene"]:
                continue
            
            title = col.get("title") or col_id
            standard_collections.append({
                "id": col_id,
                "title": title
            })
    except Exception as e:
        print(f"Lỗi khi kết nối stac-fastapi: {e}")
        # Vẫn tiếp tục trả về các bộ sưu tập mặc định kể cả khi stac-fastapi bị tắt

    # 3. Ghi cache lại vào Redis
    redis_cache.set(CACHE_KEY_COLLECTIONS, standard_collections, CACHE_TTL_COLLECTIONS)
    return standard_collections
