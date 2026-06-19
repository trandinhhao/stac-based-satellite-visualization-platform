import os
import urllib.request
import urllib.error
from fastapi import APIRouter, HTTPException, Body, Response
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import json
import hashlib
from services.stac.collections import get_stac_collections
from services.stac.search import search_stac_images
from services.redis_cache import redis_cache

router = APIRouter(prefix="/stac", tags=["STAC"])

class SearchRequest(BaseModel):
    collections: Optional[List[str]] = Field(default=None, description="List of collection IDs")
    datetime: Optional[str] = Field(default=None, description="Spatio-temporal date range filter")
    bbox: Optional[List[float]] = Field(default=None, description="Bounding Box [min_lng, min_lat, max_lng, max_lat]")
    intersects: Optional[Dict[str, Any]] = Field(default=None, description="GeoJSON Geometry filter")
    limit: Optional[int] = Field(default=50, description="Max number of items to return")

@router.get("/collections")
def get_collections():
    cache_key = "stac_collections"
    cached = redis_cache.get(cache_key)
    if cached:
        return cached

    try:
        res = get_stac_collections()
        redis_cache.set(cache_key, res, expire_seconds=3600)  # Cache for 1 hour
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def normalize_datetime(dt_str: str) -> str:
    if not dt_str:
        return dt_str
    
    parts = dt_str.split('/')
    normalized_parts = []
    
    for idx, part in enumerate(parts):
        part = part.strip()
        if len(part) == 10:  # YYYY-MM-DD
            if idx == 0:
                normalized_parts.append(f"{part}T00:00:00Z")
            else:
                normalized_parts.append(f"{part}T23:59:59Z")
        else:
            normalized_parts.append(part)
            
    if len(parts) == 1 and len(parts[0].strip()) == 10:
        single_date = parts[0].strip()
        return f"{single_date}T00:00:00Z/{single_date}T23:59:59Z"
        
    return "/".join(normalized_parts)

@router.post("/search")
def search_items(req: SearchRequest):
    # Validate BBOX
    if req.bbox:
        if len(req.bbox) != 4:
            raise HTTPException(status_code=400, detail="BBOX must contain exactly 4 coordinates [min_lng, min_lat, max_lng, max_lat]")
        for coord in req.bbox:
            if not isinstance(coord, (int, float)):
                raise HTTPException(status_code=400, detail="BBOX coordinates must be numbers")
                
    # Validate and Normalize Datetime
    if req.datetime:
        parts = req.datetime.split('/')
        if len(parts) > 2:
            raise HTTPException(status_code=400, detail="Datetime must be in format YYYY-MM-DD or YYYY-MM-DD/YYYY-MM-DD")
        req.datetime = normalize_datetime(req.datetime)

    try:
        query_params = req.model_dump(exclude_none=True)
        # Create a deterministic key based on sorted query parameters
        param_str = json.dumps(query_params, sort_keys=True)
        param_hash = hashlib.md5(param_str.encode("utf-8")).hexdigest()
        cache_key = f"stac_search:{param_hash}"
        
        cached = redis_cache.get(cache_key)
        if cached:
            return cached

        res = search_stac_images(query_params)
        redis_cache.set(cache_key, res, expire_seconds=300)  # Cache for 5 minutes
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

PLANET_API_KEY = os.getenv("PLANET_API_KEY")

@router.get("/planet/tiles/{mosaic_name}/{z}/{x}/{y}.png")
def get_planet_tile(mosaic_name: str, z: int, x: int, y: int):
    if not PLANET_API_KEY or PLANET_API_KEY == "your_planet_api_key_here":
        raise HTTPException(status_code=500, detail="PLANET_API_KEY is not configured on the server")
    
    url = f"https://tiles.planet.com/basemaps/v1/planet-tiles/{mosaic_name}/gmap/{z}/{x}/{y}.png?api_key={PLANET_API_KEY}"
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            tile_data = response.read()
            return Response(
                content=tile_data,
                media_type="image/png",
                headers={"Cache-Control": "public, max-age=86400"}
            )
    except urllib.error.HTTPError as e:
        raise HTTPException(status_code=e.code, detail=f"Planet API error: {e.reason}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/planet/tiles/PSScene/{scene_id}/{z}/{x}/{y}.png")
def get_planet_scene_tile(scene_id: str, z: int, x: int, y: int):
    if not PLANET_API_KEY or PLANET_API_KEY == "your_planet_api_key_here":
        raise HTTPException(status_code=500, detail="PLANET_API_KEY is not configured on the server")
    
    url = f"https://tiles.planet.com/data/v1/PSScene/{scene_id}/{z}/{x}/{y}.png?api_key={PLANET_API_KEY}"
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            tile_data = response.read()
            return Response(
                content=tile_data,
                media_type="image/png",
                headers={"Cache-Control": "public, max-age=86400"}
            )
    except urllib.error.HTTPError as e:
        raise HTTPException(status_code=e.code, detail=f"Planet API error: {e.reason}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/planet/thumbnail/{scene_id}")
def get_planet_scene_thumbnail(scene_id: str):
    if not PLANET_API_KEY or PLANET_API_KEY == "your_planet_api_key_here":
        raise HTTPException(status_code=500, detail="PLANET_API_KEY is not configured on the server")
    
    url = f"https://tiles.planet.com/data/v1/item-types/PSScene/items/{scene_id}/thumb?width=256&api_key={PLANET_API_KEY}"
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            thumb_data = response.read()
            return Response(
                content=thumb_data,
                media_type="image/png",
                headers={"Cache-Control": "public, max-age=86400"}
            )
    except urllib.error.HTTPError as e:
        raise HTTPException(status_code=e.code, detail=f"Planet API error: {e.reason}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

