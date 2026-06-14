from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from services.stac.search import get_stac_items_by_ids

router = APIRouter(prefix="/compare", tags=["Temporal Comparison"])

class CompareRequest(BaseModel):
    imageA: str = Field(..., description="ID of first STAC Item (T1)")
    imageB: str = Field(..., description="ID of second STAC Item (T2)")

@router.post("", status_code=200)
def compare_satellite_images(payload: CompareRequest):
    """
    Unified comparison metadata fetching endpoint.
    Accepts two STAC item IDs (imageA and imageB) and returns their metadata.
    """
    ids = [payload.imageA, payload.imageB]
    try:
        items = get_stac_items_by_ids(ids)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi truy vấn dữ liệu STAC: {str(e)}"
        )

    # Map features by ID
    items_map = {item.get("id"): item for item in items}
    
    item_a = items_map.get(payload.imageA)
    item_b = items_map.get(payload.imageB)

    if not item_a or not item_b:
        missing_ids = []
        if not item_a:
            missing_ids.append(payload.imageA)
        if not item_b:
            missing_ids.append(payload.imageB)
        
        raise HTTPException(
            status_code=404,
            detail=f"Không tìm thấy ảnh vệ tinh tương ứng cho các ID: {', '.join(missing_ids)}"
        )

    return {
        "imageA": item_a,
        "imageB": item_b
    }
