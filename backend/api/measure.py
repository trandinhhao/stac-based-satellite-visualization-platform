"""
API thực hiện đo đạc không gian (Spatial Measurement).
Cung cấp các công cụ tính toán chiều dài (cho LineString) và diện tích/chu vi (cho Polygon)
sử dụng hệ tọa độ địa lý ellipsoid địa lý của PostGIS để cho ra kết quả chính xác nhất.
"""

import json
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from db.database import get_db

router = APIRouter(prefix="/measure", tags=["Spatial Measurement"])

@router.post("", status_code=200)
def calculate_measurement(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """
    Endpoint tính toán đo đạc không gian hợp nhất.
    Nhận vào hình học GeoJSON (LineString hoặc Polygon) và tính toán các giá trị trắc địa qua PostGIS geography.
    """
    geometry = payload.get("geometry")
    if not geometry or not isinstance(geometry, dict):
        raise HTTPException(
            status_code=400,
            detail="Yêu cầu phải chứa đối tượng 'geometry' hợp lệ."
        )

    geom_type = geometry.get("type")
    if geom_type not in ["LineString", "Polygon"]:
        raise HTTPException(
            status_code=400,
            detail="Kiểu hình học phải là 'LineString' hoặc 'Polygon'."
        )

    geom_json = json.dumps(geometry)
    try:
        if geom_type == "LineString":
            # Tính toán chiều dài trắc địa của LineString bằng mét (m)
            stmt = text(
                "SELECT ST_Length(ST_GeomFromGeoJSON(:geom)::geography) AS length"
            )
            res = db.execute(stmt, {"geom": geom_json}).fetchone()
            if res is None or res[0] is None:
                raise ValueError("Không thể tính toán chiều dài hình học.")
            
            return {
                "type": "distance",
                "distance": res[0],  # tính bằng mét
                "unit": "m"
            }
        else:  # Polygon
            # Tính toán diện tích trắc địa (m2) và chu vi (m)
            stmt = text(
                "SELECT ST_Area(ST_GeomFromGeoJSON(:geom)::geography) AS area, "
                "ST_Perimeter(ST_GeomFromGeoJSON(:geom)::geography) AS perimeter"
            )
            res = db.execute(stmt, {"geom": geom_json}).fetchone()
            if res is None or res[0] is None or res[1] is None:
                raise ValueError("Không thể tính toán diện tích/chu vi hình học.")

            return {
                "type": "area",
                "area": res[0],        # tính bằng mét vuông (m2)
                "perimeter": res[1],   # tính bằng mét (m)
                "unit_area": "m2",
                "unit_perimeter": "m"
            }
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Lỗi tính toán hình học trong PostGIS: {str(e)}"
        )
