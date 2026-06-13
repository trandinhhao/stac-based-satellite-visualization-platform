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
    Unified calculation endpoint.
    Accepts GeoJSON geometry (LineString or Polygon) and calculates geodesic values using PostGIS.
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
            # Geodesic length of LineString in meters
            stmt = text(
                "SELECT ST_Length(ST_GeomFromGeoJSON(:geom)::geography) AS length"
            )
            res = db.execute(stmt, {"geom": geom_json}).fetchone()
            if res is None or res[0] is None:
                raise ValueError("Không thể tính chiều dài hình học.")
            
            return {
                "type": "distance",
                "distance": res[0],  # in meters
                "unit": "m"
            }
        else:  # Polygon
            # Geodesic area in square meters and perimeter in meters
            stmt = text(
                "SELECT ST_Area(ST_GeomFromGeoJSON(:geom)::geography) AS area, "
                "ST_Perimeter(ST_GeomFromGeoJSON(:geom)::geography) AS perimeter"
            )
            res = db.execute(stmt, {"geom": geom_json}).fetchone()
            if res is None or res[0] is None or res[1] is None:
                raise ValueError("Không thể tính diện tích/chu vi hình học.")

            return {
                "type": "area",
                "area": res[0],        # in square meters
                "perimeter": res[1],   # in meters
                "unit_area": "m2",
                "unit_perimeter": "m"
            }
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Lỗi tính toán hình học trong PostGIS: {str(e)}"
        )
