import json
from uuid import UUID
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from fastapi.responses import JSONResponse
from sqlalchemy import text, func
from sqlalchemy.orm import Session

from db.database import get_db
from models.aoi import AOI
from schemas.aoi import AOICreate, AOIUpdate, AOIResponse

router = APIRouter(prefix="/aois", tags=["AOI Management"])

def db_row_to_response_dict(row) -> dict:
    """Helper to convert database select results containing geometry JSON string to dict."""
    return {
        "id": row.id,
        "name": row.name,
        "description": row.description,
        "geometry": json.loads(row.geometry),
        "area": row.area,
        "perimeter": row.perimeter,
        "created_at": row.created_at,
        "updated_at": row.updated_at
    }

def get_aoi_by_id_geojson(db: Session, aoi_id: UUID) -> Optional[dict]:
    """Fetch AOI from DB, returning geometry as GeoJSON string."""
    stmt = text(
        "SELECT id, name, description, ST_AsGeoJSON(geometry) AS geometry, "
        "area, perimeter, created_at, updated_at "
        "FROM aois WHERE id = :id"
    )
    row = db.execute(stmt, {"id": aoi_id}).fetchone()
    if not row:
        return None
    return db_row_to_response_dict(row)

def compute_spatial_properties(db: Session, geometry: dict) -> tuple:
    """Calculate geodesic area (sq m) and perimeter (m) using PostGIS geography."""
    geom_json = json.dumps(geometry)
    try:
        # Cast geometry to geography to calculate metric area and length on the ellipsoid
        stmt = text(
            "SELECT ST_Area(ST_GeomFromGeoJSON(:geom)::geography) AS area, "
            "ST_Perimeter(ST_GeomFromGeoJSON(:geom)::geography) AS perimeter"
        )
        res = db.execute(stmt, {"geom": geom_json}).fetchone()
        return res[0], res[1]
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Hình học không hợp lệ hoặc lỗi tính toán PostGIS: {str(e)}"
        )

@router.post("", response_model=AOIResponse, status_code=201)
def create_aoi(data: AOICreate, db: Session = Depends(get_db)):
    # 1. Validate that the GeoJSON geometry is a Polygon
    geom_type = data.geometry.get("type")
    if geom_type != "Polygon":
        raise HTTPException(
            status_code=400,
            detail="Hình học AOI phải là kiểu Polygon."
        )

    # 2. Compute area and perimeter using PostGIS
    area, perimeter = compute_spatial_properties(db, data.geometry)

    # 3. Save to database using parameterized SQL functions
    try:
        geom_json = json.dumps(data.geometry)
        new_id = func.uuid_generate_v4()  # Let DB generate UUID or we can generate in Python
        stmt = text(
            "INSERT INTO aois (id, name, description, geometry, area, perimeter, created_at, updated_at) "
            "VALUES (gen_random_uuid(), :name, :description, ST_SetSRID(ST_GeomFromGeoJSON(:geom), 4326), "
            ":area, :perimeter, :now, :now) "
            "RETURNING id"
        )
        res = db.execute(
            stmt,
            {
                "name": data.name,
                "description": data.description,
                "geom": geom_json,
                "area": area,
                "perimeter": perimeter,
                "now": datetime.utcnow()
            }
        )
        inserted_id = res.fetchone()[0]
        db.commit()

        # Fetch and return the newly created AOI
        aoi = get_aoi_by_id_geojson(db, inserted_id)
        if not aoi:
            raise HTTPException(status_code=500, detail="Không thể tải lại AOI sau khi lưu.")
        return aoi
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi lưu AOI vào cơ sở dữ liệu: {str(e)}"
        )

@router.get("", response_model=List[AOIResponse])
def get_all_aois(db: Session = Depends(get_db)):
    stmt = text(
        "SELECT id, name, description, ST_AsGeoJSON(geometry) AS geometry, "
        "area, perimeter, created_at, updated_at "
        "FROM aois ORDER BY created_at DESC"
    )
    rows = db.execute(stmt).fetchall()
    return [db_row_to_response_dict(row) for row in rows]

@router.get("/{aoi_id}", response_model=AOIResponse)
def get_aoi(aoi_id: UUID, db: Session = Depends(get_db)):
    aoi = get_aoi_by_id_geojson(db, aoi_id)
    if not aoi:
        raise HTTPException(
            status_code=404,
            detail=f"Không tìm thấy AOI với ID {aoi_id}"
        )
    return aoi

@router.put("/{aoi_id}", response_model=AOIResponse)
def update_aoi(aoi_id: UUID, data: AOIUpdate, db: Session = Depends(get_db)):
    # Check if exists
    existing = get_aoi_by_id_geojson(db, aoi_id)
    if not existing:
        raise HTTPException(
            status_code=404,
            detail=f"Không tìm thấy AOI với ID {aoi_id} để cập nhật"
        )

    # Prepare update query
    updates = []
    params = {"id": aoi_id, "now": datetime.utcnow()}

    if data.name is not None:
        updates.append("name = :name")
        params["name"] = data.name

    if data.description is not None:
        updates.append("description = :description")
        params["description"] = data.description

    if data.geometry is not None:
        geom_type = data.geometry.get("type")
        if geom_type != "Polygon":
            raise HTTPException(
                status_code=400,
                detail="Hình học AOI phải là kiểu Polygon."
            )
        
        # Recalculate area and perimeter
        area, perimeter = compute_spatial_properties(db, data.geometry)
        updates.append("geometry = ST_SetSRID(ST_GeomFromGeoJSON(:geom), 4326)")
        updates.append("area = :area")
        updates.append("perimeter = :perimeter")
        params["geom"] = json.dumps(data.geometry)
        params["area"] = area
        params["perimeter"] = perimeter

    if not updates:
        return existing

    updates.append("updated_at = :now")

    try:
        query_str = f"UPDATE aois SET {', '.join(updates)} WHERE id = :id"
        db.execute(text(query_str), params)
        db.commit()

        # Fetch and return the updated AOI
        return get_aoi_by_id_geojson(db, aoi_id)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi cập nhật thông tin AOI: {str(e)}"
        )

@router.delete("/{aoi_id}")
def delete_aoi(aoi_id: UUID, db: Session = Depends(get_db)):
    # Check if exists
    stmt_check = text("SELECT id FROM aois WHERE id = :id")
    row = db.execute(stmt_check, {"id": aoi_id}).fetchone()
    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"Không tìm thấy AOI với ID {aoi_id} để xóa"
        )

    try:
        stmt_del = text("DELETE FROM aois WHERE id = :id")
        db.execute(stmt_del, {"id": aoi_id})
        db.commit()
        return {"success": True, "message": "Xóa AOI thành công."}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi xóa AOI: {str(e)}"
        )

@router.get("/{aoi_id}/export")
def export_aoi_geojson(aoi_id: UUID, db: Session = Depends(get_db)):
    aoi = get_aoi_by_id_geojson(db, aoi_id)
    if not aoi:
        raise HTTPException(
            status_code=404,
            detail=f"Không tìm thấy AOI với ID {aoi_id} để xuất file"
        )

    # Standard GeoJSON Feature format
    geojson_feature = {
        "type": "Feature",
        "properties": {
            "id": str(aoi["id"]),
            "name": aoi["name"],
            "description": aoi["description"],
            "area_m2": aoi["area"],
            "perimeter_m": aoi["perimeter"],
            "created_at": aoi["created_at"].isoformat() if isinstance(aoi["created_at"], datetime) else aoi["created_at"],
            "updated_at": aoi["updated_at"].isoformat() if isinstance(aoi["updated_at"], datetime) else aoi["updated_at"]
        },
        "geometry": aoi["geometry"]
    }

    # Format file download response
    headers = {
        "Content-Disposition": f"attachment; filename=aoi_{aoi['name'].replace(' ', '_')}.geojson"
    }
    return JSONResponse(content=geojson_feature, headers=headers)

@router.post("/import", response_model=AOIResponse, status_code=201)
async def import_aoi_geojson(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        content = await file.read()
        geojson_data = json.loads(content.decode('utf-8'))
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Định dạng tệp không hợp lệ, không thể giải mã JSON: {str(e)}"
        )

    # Parse and extract Polygon geometry from Feature / FeatureCollection / Geometry
    geometry = None
    name = file.filename.rsplit('.', 1)[0].replace('_', ' ')
    description = "Được nhập từ tệp GeoJSON"

    geojson_type = geojson_data.get("type")
    
    if geojson_type == "FeatureCollection":
        features = geojson_data.get("features", [])
        if not features:
            raise HTTPException(status_code=400, detail="FeatureCollection rỗng.")
        # Take the first feature's geometry
        first_feature = features[0]
        geometry = first_feature.get("geometry")
        props = first_feature.get("properties", {})
        name = props.get("name") or props.get("title") or name
        description = props.get("description") or description
    elif geojson_type == "Feature":
        geometry = geojson_data.get("geometry")
        props = geojson_data.get("properties", {})
        name = props.get("name") or props.get("title") or name
        description = props.get("description") or description
    elif geojson_type == "Polygon":
        geometry = geojson_data
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Loại đối tượng GeoJSON '{geojson_type}' không được hỗ trợ. Chỉ hỗ trợ FeatureCollection, Feature, hoặc Polygon."
        )

    if not geometry or geometry.get("type") != "Polygon":
        raise HTTPException(
            status_code=400,
            detail="Tệp nhập vào không chứa hình học kiểu Polygon hợp lệ."
        )

    # Compute area and perimeter
    area, perimeter = compute_spatial_properties(db, geometry)

    # Insert into database
    try:
        geom_json = json.dumps(geometry)
        stmt = text(
            "INSERT INTO aois (id, name, description, geometry, area, perimeter, created_at, updated_at) "
            "VALUES (gen_random_uuid(), :name, :description, ST_SetSRID(ST_GeomFromGeoJSON(:geom), 4326), "
            ":area, :perimeter, :now, :now) "
            "RETURNING id"
        )
        res = db.execute(
            stmt,
            {
                "name": name,
                "description": description,
                "geom": geom_json,
                "area": area,
                "perimeter": perimeter,
                "now": datetime.utcnow()
            }
        )
        inserted_id = res.fetchone()[0]
        db.commit()

        return get_aoi_by_id_geojson(db, inserted_id)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi lưu AOI nhập khẩu: {str(e)}"
        )
