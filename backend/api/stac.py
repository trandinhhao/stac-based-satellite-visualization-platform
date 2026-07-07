"""
Module cung cấp các endpoint API cho dịch vụ ảnh vệ tinh STAC.
Hỗ trợ tìm kiếm, phân tích cú pháp thời gian, quản lý danh sách Collection,
và lấy ảnh bản đồ (tiles) cũng như ảnh thu nhỏ (thumbnail) trực tiếp từ Planet Labs API.
"""

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
    """
    Schema mô hình hóa yêu cầu tìm kiếm ảnh vệ tinh STAC.
    """
    collections: Optional[List[str]] = Field(default=None, description="Danh sách các ID của bộ sưu tập vệ tinh")
    datetime: Optional[str] = Field(default=None, description="Bộ lọc thời gian (dạng YYYY-MM-DD hoặc khoảng YYYY-MM-DD/YYYY-MM-DD)")
    bbox: Optional[List[float]] = Field(default=None, description="Khung giới hạn địa lý [min_lng, min_lat, max_lng, max_lat]")
    intersects: Optional[Dict[str, Any]] = Field(default=None, description="Hình học dạng GeoJSON để tìm giao cắt (thường là Polygon)")
    limit: Optional[int] = Field(default=50, description="Số lượng kết quả tối đa trả về")

@router.get("/collections")
def get_collections():
    """
    Lấy danh sách toàn bộ các bộ sưu tập STAC khả dụng (Sentinel, Landsat, PlanetScope).
    Có áp dụng cache trong 1 giờ.
    """
    cache_key = "stac_collections"
    cached = redis_cache.get(cache_key)
    if cached:
        return cached

    try:
        res = get_stac_collections()
        redis_cache.set(cache_key, res, expire_seconds=3600)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def normalize_datetime(dt_str: str) -> str:
    """
    Chuẩn hóa chuỗi thời gian nhập từ người dùng về định dạng chuẩn ISO 8601 UTC mong muốn bởi STAC API.
    Ví dụ: '2026-01-01' -> '2026-01-01T00:00:00Z/2026-01-01T23:59:59Z'.
    """
    if not dt_str:
        return dt_str
    
    parts = dt_str.split('/')
    normalized_parts = []
    
    for idx, part in enumerate(parts):
        part = part.strip()
        if len(part) == 10:  # Định dạng YYYY-MM-DD
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
    """
    Tìm kiếm các ảnh vệ tinh khớp với yêu cầu của người dùng.
    Dữ liệu truy vấn được chuẩn hóa trước khi gửi đi, và kết quả được lưu trữ trong cache Redis trong 5 phút.
    """
    # Xác thực khung giới hạn địa lý BBOX
    if req.bbox:
        if len(req.bbox) != 4:
            raise HTTPException(status_code=400, detail="BBOX phải chứa chính xác 4 phần tử [min_lng, min_lat, max_lng, max_lat]")
        for coord in req.bbox:
            if not isinstance(coord, (int, float)):
                raise HTTPException(status_code=400, detail="Các giá trị tọa độ trong BBOX phải là dạng số")
                
    # Chuẩn hóa thời gian nếu người dùng chỉ định
    if req.datetime:
        parts = req.datetime.split('/')
        if len(parts) > 2:
            raise HTTPException(status_code=400, detail="Định dạng Datetime phải là YYYY-MM-DD hoặc YYYY-MM-DD/YYYY-MM-DD")
        req.datetime = normalize_datetime(req.datetime)

    try:
        query_params = req.model_dump(exclude_none=True)
        # Tạo mã hash duy nhất cho bộ tham số truy vấn làm cache key
        param_str = json.dumps(query_params, sort_keys=True)
        param_hash = hashlib.md5(param_str.encode("utf-8")).hexdigest()
        cache_key = f"stac_search:{param_hash}"
        
        cached = redis_cache.get(cache_key)
        if cached:
            return cached

        res = search_stac_images(query_params)
        redis_cache.set(cache_key, res, expire_seconds=300)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

PLANET_API_KEY = os.getenv("PLANET_API_KEY")

@router.get("/planet/tiles/{mosaic_name}/{z}/{x}/{y}.png")
def get_planet_tile(mosaic_name: str, z: int, x: int, y: int):
    """
    Lấy ô ảnh vệ tinh (tile) từ cơ sở dữ liệu nền PlanetScope Basemaps theo tọa độ lưới (z, x, y).
    Đóng vai trò Proxy giúp frontend tải ảnh trực tiếp mà không để lộ Planet API Key.
    """
    if not PLANET_API_KEY or PLANET_API_KEY == "your_planet_api_key_here":
        raise HTTPException(status_code=500, detail="PLANET_API_KEY chưa được thiết lập trên máy chủ")
    
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
        raise HTTPException(status_code=e.code, detail=f"Lỗi Planet API: {e.reason}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/planet/tiles/PSScene/{scene_id}/{z}/{x}/{y}.png")
def get_planet_scene_tile(scene_id: str, z: int, x: int, y: int):
    """
    Lấy ô ảnh vệ tinh đơn lẻ (scene tile) của PlanetScope theo tọa độ lưới (z, x, y) và Scene ID cụ thể.
    """
    if not PLANET_API_KEY or PLANET_API_KEY == "your_planet_api_key_here":
        raise HTTPException(status_code=500, detail="PLANET_API_KEY chưa được thiết lập trên máy chủ")
    
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
        raise HTTPException(status_code=e.code, detail=f"Lỗi Planet API: {e.reason}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/planet/thumbnail/{scene_id}")
def get_planet_scene_thumbnail(scene_id: str):
    """
    Tải ảnh thu nhỏ (thumbnail) độ phân giải thấp của PlanetScope Scene phục vụ hiển thị xem trước nhanh trên UI.
    """
    if not PLANET_API_KEY or PLANET_API_KEY == "your_planet_api_key_here":
        raise HTTPException(status_code=500, detail="PLANET_API_KEY chưa được thiết lập trên máy chủ")
    
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
        raise HTTPException(status_code=e.code, detail=f"Lỗi Planet API: {e.reason}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
