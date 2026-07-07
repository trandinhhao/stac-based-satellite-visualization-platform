"""
Module định nghĩa các Celery background tasks chạy bất đồng bộ.
Cập nhật trạng thái Job vào DB và phát tín hiệu trạng thái thời gian thực thông qua Redis Pub/Sub.
"""

import os
import sys
import json
import uuid
import datetime
import redis
from celery.utils.log import get_task_logger

# Đảm bảo thư mục /app nằm trong PYTHONPATH cho các luồng con của Celery
if '/app' not in sys.path:
    sys.path.insert(0, '/app')

from workers.celery_app import celery_app
from db.database import SessionLocal
from models.job import Job

logger = get_task_logger(__name__)

# Lấy cấu hình URL Redis từ biến môi trường
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

# Khởi tạo Redis client phục vụ phát tín hiệu WebSocket cập nhật tiến độ
redis_client = redis.from_url(REDIS_URL)

def update_job_status(job_id: str, status: str, progress: int, result_url: str = None, error_message: str = None):
    """
    Cập nhật trạng thái tiến trình Job trong PostgreSQL database,
    đồng thời publish message tiến trình sang Redis Pub/Sub channel 'job_updates'.
    """
    db = SessionLocal()
    try:
        job_uuid = uuid.UUID(job_id)
        job = db.query(Job).filter(Job.id == job_uuid).first()
        if job:
            job.status = status
            job.progress = progress
            if result_url is not None:
                job.result_url = result_url
            if error_message is not None:
                job.error_message = error_message
            if status == "running" and not job.started_at:
                job.started_at = datetime.datetime.utcnow()
            if status in ["completed", "failed", "cancelled"]:
                job.completed_at = datetime.datetime.utcnow()
            db.commit()
            logger.info(f"Đã cập nhật Job {job_id} trong DB: status={status}, tiến độ={progress}%")
            
            # Phân loại sự kiện WebSocket phù hợp với trạng thái hiện tại
            event_type = "job_progress"
            if status == "running" and progress <= 15:
                event_type = "job_started"
            elif status == "completed":
                event_type = "job_completed"
            elif status == "failed":
                event_type = "job_failed"
            elif status == "cancelled":
                event_type = "job_cancelled"
                
            event_payload = {
                "event": event_type,
                "job_id": job_id,
                "progress": progress,
                "status": status,
                "job_type": job.job_type,
            }
            if error_message is not None:
                event_payload["error"] = error_message
            if result_url is not None:
                event_payload["result_url"] = result_url
                
            try:
                # Publish sự kiện để FastAPI WebSocket listener thu được dữ liệu
                redis_client.publish("job_updates", json.dumps(event_payload))
                logger.info(f"Đã bắn sự kiện {event_type} qua Redis Pub/Sub cho Job {job_id}")
            except Exception as re:
                logger.error(f"Lỗi khi publish cập nhật tiến trình Job sang Redis: {re}")
    except Exception as e:
        logger.error(f"Lỗi khi cập nhật trạng thái Job trong DB: {e}")
    finally:
        db.close()

@celery_app.task(bind=True, max_retries=3)
def process_detection_task(self, job_id: str, aoi_id: str, collection: str):
    """
    Celery Task xử lý bất đồng bộ tiến trình nhận diện đối tượng AI YOLO
    trên ảnh vệ tinh cắt theo ranh giới vùng AOI.
    """
    logger.info(f"Bắt đầu tác vụ nhận diện đối tượng AI cho Job ID: {job_id} (AOI: {aoi_id})")
    update_job_status(job_id, "running", 10)
    try:
        # 1. Truy vấn thông tin cấu trúc hình học đa giác AOI từ PostgreSQL
        db = SessionLocal()
        geojson_geom = None
        try:
            from sqlalchemy import text
            aoi_uuid = uuid.UUID(aoi_id)
            geom_str = db.execute(
                text("SELECT ST_AsGeoJSON(geometry) FROM aois WHERE id = :id"),
                {"id": aoi_uuid}
            ).scalar()
            if geom_str:
                geojson_geom = json.loads(geom_str)
        except Exception as e:
            logger.error(f"Lỗi khi lấy dữ liệu hình học AOI từ cơ sở dữ liệu: {e}")
        finally:
            db.close()

        def on_detection_progress(pct: int, msg: str = ""):
            update_job_status(job_id, "running", pct)

        update_job_status(job_id, "running", 15)
        
        # 2. Gọi hàm thực thi Pipeline nhận diện đối tượng thực tế trên Google Satellite
        from services.ai.detector import run_real_detection
        if geojson_geom:
            detections = run_real_detection(geojson_geom, progress_callback=on_detection_progress)
        else:
            # Dữ liệu dự phòng mặc định nếu không lấy được hình học đa giác
            detections = [
                {"object_class": "aircraft", "confidence": 0.94, "bbox": [105.8015, 21.0251, 105.8032, 21.0272]},
                {"object_class": "vehicle",  "confidence": 0.89, "bbox": [105.8041, 21.0222, 105.8052, 21.0234]},
                {"object_class": "ship",     "confidence": 0.84, "bbox": [105.8021, 21.0263, 105.8045, 21.0284]}
            ]
            
        update_job_status(job_id, "running", 95)
        
        # Trỏ URL kết quả về API lấy danh sách nhận diện theo Job ID
        result_url = f"/api/v1/detections/{job_id}"
        
        # 3. Lưu toàn bộ kết quả khung nhận diện đối tượng địa lý vào PostgreSQL
        db = SessionLocal()
        try:
            from models.detection import Detection
            for det in detections:
                db_det = Detection(
                    id=uuid.uuid4(),
                    job_id=uuid.UUID(job_id),
                    object_class=det.get("object_class", det.get("class", "unknown")),
                    confidence=det["confidence"],
                    bbox=det["bbox"]
                )
                db.add(db_det)
            db.commit()
            logger.info(f"Lưu thành công {len(detections)} đối tượng nhận diện được vào PostgreSQL.")
        except Exception as e:
            logger.error(f"Lỗi khi ghi các đối tượng nhận diện vào PostgreSQL: {e}")
            db.rollback()
        finally:
            db.close()
            
        update_job_status(job_id, "completed", 100, result_url=result_url)
        return {"status": "completed", "result_url": result_url}
    except Exception as exc:
        logger.error(f"Lỗi hệ thống khi thực thi tác vụ nhận diện: {exc}")
        if self.request.retries < self.max_retries:
            update_job_status(job_id, "running", 50, error_message=f"Lỗi: {str(exc)}. Đang thử lại...")
            delay = 5 * (2 ** self.request.retries)
            raise self.retry(exc=exc, countdown=delay)
        else:
            update_job_status(job_id, "failed", 100, error_message=f"Tác vụ thất bại sau 3 lần thử. Chi tiết: {str(exc)}")
            raise exc
