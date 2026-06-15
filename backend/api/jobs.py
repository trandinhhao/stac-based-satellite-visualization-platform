import os
import json
import uuid
import asyncio
import redis.asyncio as aioredis
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
from db.database import get_db
from models.job import Job
from workers.celery_app import celery_app
from workers.tasks import process_aoi_task, process_comparison_task, process_detection_task

router = APIRouter(prefix="/jobs", tags=["Job Management"])

RESULTS_DIR = os.getenv("RESULTS_DIR", "/app/results")

# Pydantic schemas for request validation
class JobCreate(BaseModel):
    job_type: str = Field(..., description="Type of async job: 'aoi_extraction' | 'comparison' | 'object_detection'")
    aoi_id: Optional[str] = Field(None, description="AOI ID associated with the job")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Metadata payload containing task search filters or image IDs")

class JobResponse(BaseModel):
    id: str
    user_id: Optional[str]
    aoi_id: Optional[str]
    job_type: str
    status: str
    progress: int
    result_url: Optional[str]
    error_message: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

@router.post("", status_code=201)
def create_job(data: JobCreate, db: Session = Depends(get_db)):
    """Create a background job and dispatch it to Celery workers."""
    if data.job_type not in ["aoi_extraction", "comparison", "object_detection"]:
        raise HTTPException(
            status_code=400,
            detail="Loại job không hợp lệ. Phải là 'aoi_extraction', 'comparison' hoặc 'object_detection'."
        )

    # Validate UUID if aoi_id is provided
    aoi_uuid = None
    if data.aoi_id:
        try:
            aoi_uuid = uuid.UUID(data.aoi_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="aoi_id không hợp lệ (phải là UUID).")

    # 1. Insert Job entry into the database
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
        raise HTTPException(status_code=500, detail=f"Không thể khởi tạo Job trong DB: {str(e)}")

    # 2. Dispatch task to Celery using the Job UUID as the task_id
    job_id_str = str(job_id)
    try:
        if data.job_type == "aoi_extraction":
            process_aoi_task.apply_async(
                args=[job_id_str, data.payload],
                task_id=job_id_str
            )
        elif data.job_type == "comparison":
            image_a = data.payload.get("imageA")
            image_b = data.payload.get("imageB")
            if not image_a or not image_b:
                raise ValueError("Payload đối chiếu so sánh yêu cầu tham số 'imageA' và 'imageB'.")
            process_comparison_task.apply_async(
                args=[job_id_str, image_a, image_b],
                task_id=job_id_str
            )
        elif data.job_type == "object_detection":
            if not data.aoi_id:
                raise ValueError("Yêu cầu tham số 'aoi_id' cho tác vụ nhận diện đối tượng.")
            collection = data.payload.get("collection", "sentinel-2")
            process_detection_task.apply_async(
                args=[job_id_str, str(aoi_uuid), collection],
                task_id=job_id_str
            )
    except Exception as e:
        # Update job to failed in DB
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

@router.get("", response_model=List[JobResponse])
def list_jobs(
    status: Optional[str] = Query(None, description="Lọc theo trạng thái"),
    job_type: Optional[str] = Query(None, description="Lọc theo loại job"),
    db: Session = Depends(get_db)
):
    """Retrieve all jobs with optional filters."""
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
                "started_at": r.started_at,
                "completed_at": r.completed_at,
                "created_at": r.created_at
            }
            for r in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi truy vấn danh sách Jobs: {str(e)}")

@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: str, db: Session = Depends(get_db)):
    """Fetch status and progress for a single job."""
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
        "started_at": row.started_at,
        "completed_at": row.completed_at,
        "created_at": row.created_at
    }

@router.get("/{job_id}/result")
def get_job_result(job_id: str, db: Session = Depends(get_db)):
    """Retrieve raw JSON results from a completed job."""
    # 1. Verify job exists in PostgreSQL
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="job_id không đúng định dạng UUID.")

    job = db.execute(text("SELECT status FROM jobs WHERE id = :id"), {"id": job_uuid}).fetchone()
    if not job:
        raise HTTPException(status_code=404, detail="Không tìm thấy Job.")
    
    if job.status != "completed":
        raise HTTPException(status_code=400, detail=f"Kết quả chưa sẵn sàng. Trạng thái Job hiện tại: {job.status}")

    # 2. Read JSON results file from disk
    file_path = os.path.join(RESULTS_DIR, f"{job_id}.json")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Không tìm thấy tệp kết quả trên ổ đĩa.")

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Không thể đọc tệp kết quả: {str(e)}")

@router.delete("/{job_id}")
def cancel_job(job_id: str, db: Session = Depends(get_db)):
    """Cancel / revoke a running or queued job."""
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="job_id không đúng định dạng UUID.")

    # 1. Fetch current status
    row = db.execute(text("SELECT status FROM jobs WHERE id = :id"), {"id": job_uuid}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy Job.")

    if row.status in ["completed", "failed", "cancelled"]:
        return {"message": f"Job đã kết thúc với trạng thái: {row.status}", "job_id": job_id}

    # 2. Revoke Celery task (terminate=True terminates active worker processes executing it)
    try:
        celery_app.control.revoke(job_id, terminate=True)
    except Exception as e:
        # Log and continue (worker might not be active, but we still update DB)
        print(f"Error revoking Celery task {job_id}: {e}")

    # 3. Update database status
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

@router.get("/sse")
async def sse_jobs(request: Request):
    """Server-Sent Events (SSE) fallback endpoint to stream real-time job updates."""
    async def event_generator():
        redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
        client = aioredis.from_url(redis_url, decode_responses=True)
        pubsub = client.pubsub()
        await pubsub.subscribe("job_updates")
        try:
            while True:
                # Terminate stream if client disconnects
                if await request.is_disconnected():
                    break
                # Fetch messages from Redis Pub/Sub channel
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message:
                    yield f"data: {message['data']}\n\n"
                await asyncio.sleep(0.5)
        except Exception as e:
            pass
        finally:
            await pubsub.unsubscribe("job_updates")
            await client.close()

    return StreamingResponse(event_generator(), media_type="text/event-stream")
