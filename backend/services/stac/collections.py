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
    
    # Standard satellite collections that should ALWAYS be available in the dropdown
    # (These are queried globally from MPC or Planet APIs)
    standard_collections = [
        {"id": "sentinel-2-l2a", "title": "Sentinel-2 L2A (Global - MPC)"},
        {"id": "sentinel-1-grd", "title": "Sentinel-1 GRD (Global - MPC)"},
        {"id": "landsat-8-c2-l2", "title": "Landsat-8 C2 L2 (Global - MPC)"},
        {"id": "landsat-9-c2-l2", "title": "Landsat-9 C2 L2 (Global - MPC)"},
        {"id": "PSScene", "title": "PlanetScope (Planet.com)"}
    ]

    # 2. Query local stac-fastapi for any additional ingested collections
    try:
        data = stac_client.get("/collections")
        collections = data.get("collections", [])
        
        for col in collections:
            col_id = col.get("id")
            # Skip sample/test collections or duplicate IDs
            if col_id in ["planetscope-ortho", "test-collection", "sentinel-2-l2a", "sentinel-1-grd", "landsat-8-c2-l2", "landsat-9-c2-l2", "PSScene"]:
                continue
            
            title = col.get("title") or col_id
            standard_collections.append({
                "id": col_id,
                "title": title
            })
    except Exception as e:
        print(f"Error querying stac-fastapi: {e}")
        # Continue with standard collections even if local stac-fastapi is down

    # 3. Cache the collections
    redis_cache.set(CACHE_KEY_COLLECTIONS, standard_collections, CACHE_TTL_COLLECTIONS)
    return standard_collections
