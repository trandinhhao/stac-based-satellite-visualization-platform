"""
API quản lý vùng quan tâm AOI (Area of Interest).
Cung cấp các endpoint để tạo mới, danh sách, cập nhật, xóa, xuất/nhập tệp GeoJSON,
và tự động tính toán diện tích, chu vi bằng PostGIS geography.
"""

import json
from uuid import UUID
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from db.database import get_db
from models.aoi import AOI
from schemas.aoi import AOICreate, AOIUpdate, AOIResponse

router = APIRouter(prefix="/aois", tags=["AOI Management"])

def db_row_to_response_dict(row) -> dict:
    """
    Hàm phụ trợ chuyển đổi kết quả truy vấn thô (chứa chuỗi JSON hình học)
    thành dạng dictionary tương thích cấu trúc API trả về.
    """
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
    """
    Truy vấn thông tin AOI chi tiết từ DB, chuyển đổi dữ liệu hình học
    về định dạng GeoJSON chuẩn bằng ST_AsGeoJSON.
    """
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
    """
    Tính toán diện tích thực địa (m2) và chu vi (m) của đa giác
    bằng cách quy đổi tọa độ hình học sang hệ địa lý PostGIS geography (WGS84).
    """
    geom_json = json.dumps(geometry)
    try:
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
    """
    Tạo mới một vùng quan tâm AOI.
    Yêu cầu hình học đầu vào phải là kiểu Polygon và tự động tính toán diện tích thực trước khi lưu DB.
    """
    geom_type = data.geometry.get("type")
    if geom_type != "Polygon":
        raise HTTPException(
            status_code=400,
            detail="Hình học AOI phải là kiểu Polygon."
        )

    # Tính toán diện tích & chu vi thực tế bằng PostGIS
    area, perimeter = compute_spatial_properties(db, data.geometry)

    try:
        geom_json = json.dumps(data.geometry)
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

        # Truy vấn thông tin chi tiết của AOI vừa tạo để phản hồi
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
    """
    Lấy danh sách tất cả các vùng AOI đã lưu, sắp xếp theo thời gian tạo mới nhất.
    """
    stmt = text(
        "SELECT id, name, description, ST_AsGeoJSON(geometry) AS geometry, "
        "area, perimeter, created_at, updated_at "
        "FROM aois ORDER BY created_at DESC"
    )
    rows = db.execute(stmt).fetchall()
    return [db_row_to_response_dict(row) for row in rows]

@router.get("/{aoi_id}", response_model=AOIResponse)
def get_aoi(aoi_id: UUID, db: Session = Depends(get_db)):
    """
    Truy xuất chi tiết một vùng quan tâm AOI cụ thể.
    """
    aoi = get_aoi_by_id_geojson(db, aoi_id)
    if not aoi:
        raise HTTPException(
            status_code=404,
            detail=f"Không tìm thấy AOI với ID {aoi_id}"
        )
    return aoi

@router.put("/{aoi_id}", response_model=AOIResponse)
def update_aoi(aoi_id: UUID, data: AOIUpdate, db: Session = Depends(get_db)):
    """
    Cập nhật thông tin (tên, mô tả, hình học địa lý) của một AOI có sẵn.
    Tự động tính toán lại diện tích & chu vi nếu hình học địa lý thay đổi.
    """
    existing = get_aoi_by_id_geojson(db, aoi_id)
    if not existing:
        raise HTTPException(
            status_code=404,
            detail=f"Không tìm thấy AOI với ID {aoi_id} để cập nhật"
        )

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
        
        # Tính toán lại các chỉ số địa lý diện tích/chu vi theo tọa độ mới
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

        return get_aoi_by_id_geojson(db, aoi_id)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi cập nhật thông tin AOI: {str(e)}"
        )

@router.delete("/{aoi_id}")
def delete_aoi(aoi_id: UUID, db: Session = Depends(get_db)):
    """
    Xóa một vùng quan tâm AOI cụ thể khỏi hệ thống.
    Đồng thời tự động xóa toàn bộ các Jobs chạy ngầm và kết quả nhận diện AI liên quan đến AOI này.
    """
    stmt_check = text("SELECT id FROM aois WHERE id = :id")
    row = db.execute(stmt_check, {"id": aoi_id}).fetchone()
    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"Không tìm thấy AOI với ID {aoi_id} để xóa"
        )

    try:
        # 1. Truy tìm và xóa tất cả các tác vụ (Jobs) và kết quả nhận diện đối tượng liên quan đến AOI này
        job_rows = db.execute(text("SELECT id FROM jobs WHERE aoi_id = :aoi_id"), {"aoi_id": aoi_id}).fetchall()
        for r in job_rows:
            # Xóa toàn bộ các bounding boxes trong bảng detections của Job tương ứng
            db.execute(text("DELETE FROM detections WHERE job_id = :job_id"), {"job_id": r.id})
            # Xóa bản ghi Job trong bảng jobs
            db.execute(text("DELETE FROM jobs WHERE id = :job_id"), {"job_id": r.id})

        # 2. Xóa vùng AOI chính
        stmt_del = text("DELETE FROM aois WHERE id = :id")
        db.execute(stmt_del, {"id": aoi_id})
        
        db.commit()
        return {"success": True, "message": "Xóa AOI và các tác vụ, kết quả nhận diện liên quan thành công."}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi xóa AOI: {str(e)}"
        )

@router.get("/{aoi_id}/export")
def export_aoi_geojson(aoi_id: UUID, db: Session = Depends(get_db)):
    """
    Xuất thông tin chi tiết vùng AOI dưới định dạng tệp tải về GeoJSON chuẩn (Feature).
    """
    aoi = get_aoi_by_id_geojson(db, aoi_id)
    if not aoi:
        raise HTTPException(
            status_code=404,
            detail=f"Không tìm thấy AOI với ID {aoi_id} để xuất file"
        )

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

    headers = {
        "Content-Disposition": f"attachment; filename=aoi_{aoi['name'].replace(' ', '_')}.geojson"
    }
    return JSONResponse(content=geojson_feature, headers=headers)

@router.post("/import", response_model=AOIResponse, status_code=201)
async def import_aoi_geojson(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Nhập mới một vùng vẽ AOI bằng cách tải lên tệp GeoJSON.
    Hỗ trợ đọc dữ liệu đa giác Polygon từ các đối tượng FeatureCollection, Feature, hoặc Polygon thô.
    """
    try:
        content = await file.read()
        geojson_data = json.loads(content.decode('utf-8'))
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Định dạng tệp không hợp lệ, không thể giải mã JSON: {str(e)}"
        )

    geometry = None
    name = file.filename.rsplit('.', 1)[0].replace('_', ' ')
    description = "Được nhập từ tệp GeoJSON"

    geojson_type = geojson_data.get("type")
    
    if geojson_type == "FeatureCollection":
        features = geojson_data.get("features", [])
        if not features:
            raise HTTPException(status_code=400, detail="FeatureCollection rỗng.")
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

    # Tính toán diện tích & chu vi thực địa bằng PostGIS cho vùng nhập
    area, perimeter = compute_spatial_properties(db, geometry)

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
