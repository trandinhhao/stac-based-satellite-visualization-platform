from .client import stac_client
from services.redis_cache import redis_cache

CACHE_KEY_COLLECTIONS = "stac_collections_cache"
CACHE_TTL_COLLECTIONS = 3600  # 1 hour in seconds

def get_stac_collections():
    # 1. Try to read from cache
    cached = redis_cache.get(CACHE_KEY_COLLECTIONS)
    if cached:
        print("[Redis] Cache HIT for STAC collections")
        return cached

    print("[Redis] Cache MISS for STAC collections, querying stac-fastapi...")
    # 2. Query stac-fastapi
    try:
        data = stac_client.get("/collections")
        collections = data.get("collections", [])
        
        # Format the response as requested in sprint-2.md
        formatted = []
        for col in collections:
            col_id = col.get("id")
            title = col.get("title") or col_id
            if col_id == "sentinel-2-l2a":
                title = "Sentinel-2 L2A (Global - MPC)"
            elif col_id == "sentinel-1-grd":
                title = "Sentinel-1 GRD (Global - MPC)"
            elif col_id == "landsat-8-c2-l2":
                title = "Landsat-8 C2 L2 (Global - MPC)"
            elif col_id == "planetscope-ortho":
                continue  # Skip PlanetScope sample in UI
            elif col_id == "test-collection":
                continue  # Skip test collection in UI
            
            formatted.append({
                "id": col_id,
                "title": title
            })
            
        # Manually inject Landsat-9 right after Landsat-8
        has_l8 = any(item["id"] == "landsat-8-c2-l2" for item in formatted)
        if has_l8:
            l8_idx = next(i for i, item in enumerate(formatted) if item["id"] == "landsat-8-c2-l2")
            formatted.insert(l8_idx + 1, {
                "id": "landsat-9-c2-l2",
                "title": "Landsat-9 C2 L2 (Global - MPC)"
            })

        # Manually inject PlanetScope (3m)
        formatted.append({
            "id": "PSScene",
            "title": "PlanetScope (3m - Planet)"
        })
            
        # 3. Cache the formatted response
        redis_cache.set(CACHE_KEY_COLLECTIONS, formatted, CACHE_TTL_COLLECTIONS)
        return formatted
    except Exception as e:
        print(f"Error fetching STAC collections: {e}")
        # Fallback to empty list or raising
        return []
