"""
API cho tính năng nhận diện đối tượng AI (AI Object Detection).
Cung cấp các endpoint để bắt đầu chạy nhận diện trên vùng AOI và lấy danh sách kết quả khung bounding box từ cơ sở dữ liệu.
"""

import os
import json
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
from db.database import get_db
from workers.tasks import process_detection_task

router = APIRouter(prefix="/detections", tags=["AI Object Detection"])

class DetectionRequest(BaseModel):
    """
    Schema yêu cầu thực hiện nhận diện đối tượng.
    """
    aoi_id: str = Field(..., description="ID của vùng AOI cần quét nhận diện đối tượng")
    model: Optional[str] = Field("yolo26", description="Phiên bản mô hình YOLO sử dụng")
    collection: Optional[str] = Field("sentinel-2", description="Tên bộ sưu tập STAC Collection làm đầu vào")

class DetectionObjectResponse(BaseModel):
    """
    Schema đại diện cho một vật thể nhận diện được.
    """
    object_class: str = Field(..., alias="object_class")
    confidence: float
    bbox: List[float]

    class Config:
        populate_by_name = True

class DetectionResultResponse(BaseModel):
    """
    Schema phản hồi danh sách toàn bộ vật thể nhận diện được của một Job.
    """
    job_id: str
    objects: List[DetectionObjectResponse]

@router.post("", status_code=201)
def start_detection(data: DetectionRequest, db: Session = Depends(get_db)):
    """
    Tạo một tiến trình chạy ngầm quét nhận diện đối tượng AI cho vùng vẽ AOI.
    """
    try:
        aoi_uuid = uuid.UUID(data.aoi_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="aoi_id không hợp lệ (phải là định dạng UUID).")

    # 1. Xác minh vùng vẽ AOI có tồn tại hay không
    aoi = db.execute(text("SELECT id FROM aois WHERE id = :id"), {"id": aoi_uuid}).fetchone()
    if not aoi:
        raise HTTPException(status_code=404, detail="Không tìm thấy vùng AOI.")

    # 2. Khởi tạo một Job trong bảng jobs
    job_id = uuid.uuid4()
    try:
        stmt = text(
            "INSERT INTO jobs (id, aoi_id, job_type, status, progress, created_at) "
            "VALUES (:id, :aoi_id, 'object_detection', 'queued', 0, :now)"
        )
        db.execute(
            stmt,
            {
                "id": job_id,
                "aoi_id": aoi_uuid,
                "now": datetime.utcnow()
            }
        )
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Không thể khởi tạo bản ghi Job trong DB: {str(e)}")

    # 3. Đẩy tác vụ chạy ngầm sang hàng chờ Celery
    job_id_str = str(job_id)
    try:
        process_detection_task.apply_async(
            args=[job_id_str, str(aoi_uuid), data.collection],
            task_id=job_id_str
        )
    except Exception as e:
        db.execute(
            text("UPDATE jobs SET status = 'failed', error_message = :err, completed_at = :now WHERE id = :id"),
            {"id": job_id, "err": f"Queue error: {str(e)}", "now": datetime.utcnow()}
        )
        db.commit()
        raise HTTPException(status_code=500, detail=f"Không thể xếp hàng tác vụ Celery: {str(e)}")

    return {
        "job_id": job_id_str,
        "status": "queued"
    }

@router.get("/{job_id}", response_model=DetectionResultResponse)
def get_detection_results(job_id: str, db: Session = Depends(get_db)):
    """
    Lấy danh sách tọa độ các khung nhận diện vật thể AI của một Job cụ thể từ database.
    """
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="job_id không đúng định dạng UUID.")

    # 1. Xác minh tác vụ Job có tồn tại không
    job = db.execute(text("SELECT status FROM jobs WHERE id = :id"), {"id": job_uuid}).fetchone()
    if not job:
        raise HTTPException(status_code=404, detail="Không tìm thấy Job.")

    if job.status != "completed":
        raise HTTPException(status_code=400, detail=f"Kết quả chưa sẵn sàng. Trạng thái tác vụ hiện tại: {job.status}")

    # 2. Truy xuất toàn bộ danh sách vật thể từ bảng detections trong PostgreSQL
    stmt = text(
        "SELECT object_class, confidence, bbox FROM detections WHERE job_id = :job_id"
    )
    rows = db.execute(stmt, {"job_id": job_uuid}).fetchall()

    objects = []
    if rows:
        objects = [
            {
                "object_class": r.object_class,
                "confidence": r.confidence,
                "bbox": r.bbox
            }
            for r in rows
        ]

    return {
        "job_id": job_id,
        "objects": objects
    }
