import hashlib
import json
import urllib.request
import urllib.parse
import os
import base64
from concurrent.futures import ThreadPoolExecutor
from .client import stac_client
from services.redis_cache import redis_cache

CACHE_TTL_SEARCH = 300  # Cache search results for 5 minutes
MPC_SEARCH_URL = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
MPC_SIGN_URL = "https://planetarycomputer.microsoft.com/api/sas/v1/sign"
PLANET_API_KEY = os.getenv("PLANET_API_KEY")

def hash_dict(d: dict) -> str:
    """Generate MD5 hash of a dictionary to use as a cache key."""
    s = json.dumps(d, sort_keys=True)
    return hashlib.md5(s.encode('utf-8')).hexdigest()

def sign_single_url(href: str) -> str:
    """Sign an Azure Blob Storage URL using the Microsoft Planetary Computer signing API."""
    if not href or "blob.core.windows.net" not in href:
        return href
    try:
        url = f"{MPC_SIGN_URL}?href={urllib.parse.quote(href)}"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data.get("href", href)
    except Exception as e:
        print(f"[STAC] Error signing URL {href}: {e}")
        return href

def sign_item_assets(item: dict) -> dict:
    """Identify and sign relevant assets in a STAC Item."""
    assets = item.get("assets", {})
    collection = item.get("collection", "")
    
    # 1. Establish visual asset for uniform frontend rendering
    if collection == "sentinel-2-l2a" and "visual" in assets:
        # Sentinel-2 true color
        pass
    elif collection == "sentinel-1-grd" and "vv" in assets:
        # Map VV band to visual for radar display
        assets["visual"] = assets["vv"].copy()
        assets["visual"]["title"] = "SAR VV Band"
    elif collection == "landsat-c2-l2" and "red" in assets:
        # Map Red band to visual for Landsat display
        assets["visual"] = assets["red"].copy()
        assets["visual"]["title"] = "Landsat Red Band (Grayscale)"
        
    # Map Landsat collection back to frontend-expected key
    if collection == "landsat-c2-l2":
        platform = item.get("properties", {}).get("platform")
        if platform == "landsat-9":
            item["collection"] = "landsat-9-c2-l2"
        else:
            item["collection"] = "landsat-8-c2-l2"

    # 2. Gather URLs that need signing
    urls_to_sign = []
    keys_to_update = []
    
    if "visual" in assets:
        urls_to_sign.append(assets["visual"].get("href", ""))
        keys_to_update.append(("visual", "href"))
        
    if "thumbnail" in assets:
        urls_to_sign.append(assets["thumbnail"].get("href", ""))
        keys_to_update.append(("thumbnail", "href"))

    # 3. Sign URLs in parallel if needed
    if urls_to_sign:
        with ThreadPoolExecutor(max_workers=5) as executor:
            signed_urls = list(executor.map(sign_single_url, urls_to_sign))
            
        for (asset_key, field_key), signed_url in zip(keys_to_update, signed_urls):
            assets[asset_key][field_key] = signed_url
            
    return item

def search_stac_images(query_params: dict):
    # 1. Prepare search payload
    payload = {}
    
    if "collections" in query_params:
        payload["collections"] = query_params["collections"]
    if "datetime" in query_params:
        payload["datetime"] = query_params["datetime"]
    if "bbox" in query_params:
        payload["bbox"] = query_params["bbox"]
    if "intersects" in query_params:
        payload["intersects"] = query_params["intersects"]
        
    # Default limit
    payload["limit"] = query_params.get("limit", 15)  # Limit to 15 for faster signing response

    # 2. Check Redis cache
    cache_key = f"stac_search_{hash_dict(payload)}"
    cached = redis_cache.get(cache_key)
    if cached:
        print(f"[Redis] Cache HIT for STAC search: {cache_key}")
        return cached

    # 3. Route query based on collection target
    requested_collections = payload.get("collections", [])
    is_global = any(col in ["sentinel-2-l2a", "sentinel-1-grd", "landsat-8-c2-l2", "landsat-9-c2-l2"] for col in requested_collections)
    is_planet = any(col == "PSScene" for col in requested_collections)

    try:
        if is_global:
            # Map frontend landsat-8-c2-l2/landsat-9-c2-l2 to MPC landsat-c2-l2
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

            # Add platform filter for Landsat splitting via query extension
            if landsat_platform:
                if "query" not in payload:
                    payload["query"] = {}
                payload["query"]["platform"] = {"eq": landsat_platform}

            print(f"[Redis] Cache MISS for STAC search: {cache_key}, querying Microsoft Planetary Computer STAC API...")
            req_data = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(
                MPC_SEARCH_URL,
                data=req_data,
                headers={'Content-Type': 'application/json'}
            )
            with urllib.request.urlopen(req) as resp:
                results = json.loads(resp.read().decode('utf-8'))
                
            # Sign the assets of the returned items in parallel
            features = results.get("features", [])
            if features:
                print(f"[STAC] Signing assets in parallel for {len(features)} returned items...")
                with ThreadPoolExecutor(max_workers=10) as executor:
                    results["features"] = list(executor.map(sign_item_assets, features))
        elif is_planet:
            print(f"[Redis] Cache MISS for STAC search: {cache_key}, querying Planet STAC API...")
            if not PLANET_API_KEY or PLANET_API_KEY == "your_planet_api_key_here":
                raise Exception("PLANET_API_KEY is not configured on the server")
                
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
                
            features = results.get("features", [])
            for item in features:
                if "assets" not in item:
                    item["assets"] = {}
                item["collection"] = "PSScene"
                item["assets"]["visual"] = {
                    "href": f"/api/stac/planet/tiles/PSScene/{item['id']}/{{z}}/{{x}}/{{y}}.png",
                    "type": "image/png",
                    "title": "PlanetScope Visual"
                }
                orig_thumb = item["assets"].get("thumbnail", {}).get("href")
                if orig_thumb:
                    item["assets"]["thumbnail"] = {
                        "href": f"/api/stac/planet/thumbnail/{item['id']}",
                        "type": "image/png",
                        "title": "PlanetScope Thumbnail"
                    }
        else:
            print(f"[Redis] Cache MISS for STAC search: {cache_key}, querying local stac-fastapi...")
            results = stac_client.post("/search", payload)

        # 4. Cache results
        redis_cache.set(cache_key, results, CACHE_TTL_SEARCH)
        return results
    except Exception as e:
        print(f"Error performing STAC search: {e}")
        raise e

def get_stac_items_by_ids(ids: list[str]) -> list[dict]:
    """
    Fetch STAC items across both local stac-fastapi and Microsoft Planetary Computer by their IDs.
    """
    features = []
    
    # 1. Try local stac-fastapi search first
    try:
        print(f"[STAC] Attempting local search for IDs: {ids}")
        local_results = stac_client.post("/search", {"ids": ids})
        local_features = local_results.get("features", [])
        features.extend(local_features)
    except Exception as e:
        print(f"[STAC] Local search by ID failed: {e}")

    # 2. Check which IDs were not found locally and query Microsoft Planetary Computer
    found_ids = {f.get("id") for f in features}
    remaining_ids = [i for i in ids if i not in found_ids]
    
    if remaining_ids:
        try:
            print(f"[STAC] Querying Microsoft Planetary Computer for IDs: {remaining_ids}")
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
                print(f"[STAC] Signing assets for {len(mpc_features)} MPC items...")
                with ThreadPoolExecutor(max_workers=5) as executor:
                    signed_features = list(executor.map(sign_item_assets, mpc_features))
                features.extend(signed_features)
        except Exception as e:
            print(f"[STAC] Global search by ID failed: {e}")

    # 3. Check remaining IDs for Planet STAC
    found_ids = {f.get("id") for f in features}
    remaining_ids = [i for i in ids if i not in found_ids]
    if remaining_ids and PLANET_API_KEY and PLANET_API_KEY != "your_planet_api_key_here":
        try:
            print(f"[STAC] Querying Planet STAC for IDs: {remaining_ids}")
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
                    "href": f"/api/stac/planet/tiles/PSScene/{item['id']}/{{z}}/{{x}}/{{y}}.png",
                    "type": "image/png",
                    "title": "PlanetScope Visual"
                }
                orig_thumb = item["assets"].get("thumbnail", {}).get("href")
                if orig_thumb:
                    item["assets"]["thumbnail"] = {
                        "href": f"/api/stac/planet/thumbnail/{item['id']}",
                        "type": "image/png",
                        "title": "PlanetScope Thumbnail"
                    }
            features.extend(planet_features)
        except Exception as e:
            print(f"[STAC] Planet search by ID failed: {e}")
            
    return features
