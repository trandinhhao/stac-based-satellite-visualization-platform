"""
API quản lý các tác vụ nền (Jobs).
Cung cấp các endpoint để tạo mới tác vụ nhận diện đối tượng AI, kiểm tra trạng thái, danh sách tiến độ và hủy tác vụ.
"""

import os
import json
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
from db.database import get_db
from models.job import Job
from workers.celery_app import celery_app
from workers.tasks import process_detection_task

router = APIRouter(prefix="/jobs", tags=["Job Management"])

class JobCreate(BaseModel):
    """
    Schema nhận yêu cầu tạo mới tác vụ nền.
    """
    job_type: str = Field(..., description="Loại tác vụ bất đồng bộ: 'aoi_extraction' | 'comparison' | 'object_detection'")
    aoi_id: Optional[str] = Field(None, description="UUID liên kết tới vùng AOI tương ứng")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Siêu dữ liệu bổ sung gửi kèm cho tác vụ (ví dụ: collection, lọc...)")

class JobResponse(BaseModel):
    """
    Schema định nghĩa cấu trúc dữ liệu trả về của tác vụ nền.
    """
    id: str
    user_id: Optional[str] = None
    aoi_id: Optional[str] = None
    job_type: str
    status: str
    progress: int
    result_url: Optional[str] = None
    error_message: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True

@router.post("", status_code=201)
def create_job(data: JobCreate, db: Session = Depends(get_db)):
    """
    Tạo mới một Job trong cơ sở dữ liệu và gửi tác vụ bất đồng bộ tương ứng sang cho Celery xử lý.
    """
    if data.job_type not in ["aoi_extraction", "comparison", "object_detection"]:
        raise HTTPException(
            status_code=400,
            detail="Loại job không hợp lệ. Phải là 'aoi_extraction', 'comparison' hoặc 'object_detection'."
        )

    # Xác thực định dạng UUID của aoi_id nếu được gửi lên
    aoi_uuid = None
    if data.aoi_id:
        try:
            aoi_uuid = uuid.UUID(data.aoi_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="aoi_id không hợp lệ (phải là định dạng UUID).")

    # 1. Khởi tạo bản ghi Job trong bảng PostgreSQL
    job_id = uuid.uuid4()
    try:
        stmt = text(
            "INSERT INTO jobs (id, aoi_id, job_type, status, progress, created_at) "
            "VALUES (:id, :aoi_id, :job_type, 'queued', 0, :now)"
        )
        db.execute(
            stmt,
            {
                "id": job_id,
                "aoi_id": aoi_uuid,
                "job_type": data.job_type,
                "now": datetime.utcnow()
            }
        )
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Không thể khởi tạo bản ghi Job trong DB: {str(e)}")

    # 2. Đẩy tác vụ sang hàng chờ Celery bằng cách dùng ID của Job làm task_id
    job_id_str = str(job_id)
    try:
        if data.job_type == "object_detection":
            if not data.aoi_id:
                raise ValueError("Yêu cầu tham số 'aoi_id' cho tác vụ nhận diện đối tượng.")
            collection = data.payload.get("collection", "sentinel-2")
            process_detection_task.apply_async(
                args=[job_id_str, str(aoi_uuid), collection],
                task_id=job_id_str
            )
        else:
            raise ValueError(f"Loại tác vụ '{data.job_type}' không được hỗ trợ xử lý nền.")
    except Exception as e:
        # Cập nhật trạng thái Job sang Thất bại trong DB nếu không đẩy được vào hàng chờ Celery
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

def format_utc(dt):
    """
    Định dạng thời gian theo chuẩn UTC ISO 8601 kết thúc bằng chữ 'Z'.
    """
    if dt is None:
        return None
    if isinstance(dt, str):
        return dt if dt.endswith('Z') or '+' in dt else dt + 'Z'
    s = dt.isoformat()
    return s if s.endswith('Z') or '+' in s else s + 'Z'

@router.get("", response_model=List[JobResponse])
def list_jobs(
    status: Optional[str] = Query(None, description="Lọc danh sách theo trạng thái"),
    job_type: Optional[str] = Query(None, description="Lọc danh sách theo loại job"),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách các tác vụ nền kèm bộ lọc trạng thái và loại job tùy chọn.
    """
    query = "SELECT id, user_id, aoi_id, job_type, status, progress, result_url, error_message, started_at, completed_at, created_at FROM jobs"
    filters = []
    params = {}

    if status:
        filters.append("status = :status")
        params["status"] = status
    if job_type:
        filters.append("job_type = :job_type")
        params["job_type"] = job_type

    if filters:
        query += " WHERE " + " AND ".join(filters)

    query += " ORDER BY created_at DESC"

    try:
        rows = db.execute(text(query), params).fetchall()
        return [
            {
                "id": str(r.id),
                "user_id": str(r.user_id) if r.user_id else None,
                "aoi_id": str(r.aoi_id) if r.aoi_id else None,
                "job_type": r.job_type,
                "status": r.status,
                "progress": r.progress,
                "result_url": r.result_url,
                "error_message": r.error_message,
                "started_at": format_utc(r.started_at),
                "completed_at": format_utc(r.completed_at),
                "created_at": format_utc(r.created_at)
            }
            for r in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi truy vấn danh sách Jobs: {str(e)}")

@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: str, db: Session = Depends(get_db)):
    """
    Lấy thông tin trạng thái và tiến trình thực thi chi tiết của một tác vụ nền cụ thể.
    """
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="job_id không đúng định dạng UUID.")

    stmt = text(
        "SELECT id, user_id, aoi_id, job_type, status, progress, result_url, error_message, started_at, completed_at, created_at "
        "FROM jobs WHERE id = :id"
    )
    row = db.execute(stmt, {"id": job_uuid}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy Job tương ứng.")

    return {
        "id": str(row.id),
        "user_id": str(row.user_id) if row.user_id else None,
        "aoi_id": str(row.aoi_id) if row.aoi_id else None,
        "job_type": row.job_type,
        "status": row.status,
        "progress": row.progress,
        "result_url": row.result_url,
        "error_message": row.error_message,
        "started_at": format_utc(row.started_at),
        "completed_at": format_utc(row.completed_at),
        "created_at": format_utc(row.created_at)
    }

@router.delete("/{job_id}")
def cancel_job(job_id: str, db: Session = Depends(get_db)):
    """
    Hủy thực thi một tác vụ nền đang chạy hoặc đang nằm trong hàng đợi.
    Thu hồi (revoke) tiến trình xử lý từ Celery worker.
    """
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="job_id không đúng định dạng UUID.")

    # 1. Truy xuất trạng thái hiện tại của tác vụ
    row = db.execute(text("SELECT status FROM jobs WHERE id = :id"), {"id": job_uuid}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy Job.")

    if row.status in ["completed", "failed", "cancelled"]:
        return {"message": f"Job đã kết thúc với trạng thái: {row.status}", "job_id": job_id}

    # 2. Thu hồi tiến trình chạy trên các Celery Workers
    try:
        celery_app.control.revoke(job_id, terminate=True)
    except Exception as e:
        print(f"Lỗi khi thu hồi Celery task {job_id}: {e}")

    # 3. Cập nhật trạng thái Job sang 'cancelled' trong database
    try:
        db.execute(
            text("UPDATE jobs SET status = 'cancelled', completed_at = :now WHERE id = :id"),
            {"id": job_uuid, "now": datetime.utcnow()}
        )
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Không thể cập nhật trạng thái hủy Job trong DB: {str(e)}")

    return {
        "message": "Đã gửi lệnh hủy Job thành công.",
        "job_id": job_id,
        "status": "cancelled"
    }
