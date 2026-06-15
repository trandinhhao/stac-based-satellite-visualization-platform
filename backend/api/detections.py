import os
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

# Request validation schemas
class DetectionRequest(BaseModel):
    aoi_id: str = Field(..., description="AOI ID to run object detection on")
    model: Optional[str] = Field("yolov8", description="YOLO model version to use")
    collection: Optional[str] = Field("sentinel-2", description="STAC collection name")

class DetectionObjectResponse(BaseModel):
    object_class: str = Field(..., alias="object_class")
    confidence: float
    bbox: List[float]

    class Config:
        populate_by_name = True

class DetectionResultResponse(BaseModel):
    job_id: str
    objects: List[DetectionObjectResponse]

@router.post("", status_code=201)
def start_detection(data: DetectionRequest, db: Session = Depends(get_db)):
    """Create a background job for AI Object Detection."""
    try:
        aoi_uuid = uuid.UUID(data.aoi_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="aoi_id không hợp lệ (phải là UUID).")

    # 1. Verify AOI exists
    aoi = db.execute(text("SELECT id FROM aois WHERE id = :id"), {"id": aoi_uuid}).fetchone()
    if not aoi:
        raise HTTPException(status_code=404, detail="Không tìm thấy vùng AOI.")

    # 2. Insert Job entry into jobs table
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
        raise HTTPException(status_code=500, detail=f"Không thể khởi tạo Job trong DB: {str(e)}")

    # 3. Dispatch Celery task
    job_id_str = str(job_id)
    try:
        process_detection_task.apply_async(
            args=[job_id_str, str(aoi_uuid), data.collection],
            task_id=job_id_str
        )
    except Exception as e:
        # Update database status to failed
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
    """Retrieve AI object detection bounding boxes from database."""
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="job_id không đúng định dạng UUID.")

    # 1. Verify job exists
    job = db.execute(text("SELECT status FROM jobs WHERE id = :id"), {"id": job_uuid}).fetchone()
    if not job:
        raise HTTPException(status_code=404, detail="Không tìm thấy Job.")

    if job.status != "completed":
        raise HTTPException(status_code=400, detail=f"Kết quả chưa sẵn sàng. Trạng thái Job hiện tại: {job.status}")

    # 2. Fetch all detected object bounding boxes from PostgreSQL database
    stmt = text(
        "SELECT object_class, confidence, bbox FROM detections WHERE job_id = :job_id"
    )
    rows = db.execute(stmt, {"job_id": job_uuid}).fetchall()

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
