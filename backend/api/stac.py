from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from services.stac.collections import get_stac_collections
from services.stac.search import search_stac_images

router = APIRouter(prefix="/stac", tags=["STAC"])

class SearchRequest(BaseModel):
    collections: Optional[List[str]] = Field(default=None, description="List of collection IDs")
    datetime: Optional[str] = Field(default=None, description="Spatio-temporal date range filter")
    bbox: Optional[List[float]] = Field(default=None, description="Bounding Box [min_lng, min_lat, max_lng, max_lat]")
    intersects: Optional[Dict[str, Any]] = Field(default=None, description="GeoJSON Geometry filter")
    limit: Optional[int] = Field(default=50, description="Max number of items to return")

@router.get("/collections")
def get_collections():
    try:
        return get_stac_collections()
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
        return search_stac_images(query_params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
