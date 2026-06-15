import os
import json
import uuid
import time
import datetime
import redis
from celery.utils.log import get_task_logger
from workers.celery_app import celery_app
from db.database import SessionLocal
from models.job import Job

logger = get_task_logger(__name__)

RESULTS_DIR = os.getenv("RESULTS_DIR", "/app/results")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

# Redis client for publishing real-time events
redis_client = redis.from_url(REDIS_URL)

def update_job_status(job_id: str, status: str, progress: int, result_url: str = None, error_message: str = None):
    """Update job state inside PostgreSQL database and publish WebSocket events via Redis."""
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
            logger.info(f"Job {job_id} updated in DB: status={status}, progress={progress}%")
            
            # Map status to matching WebSocket Event
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
                redis_client.publish("job_updates", json.dumps(event_payload))
                logger.info(f"Published event {event_type} to Redis Pub/Sub for Job {job_id}")
            except Exception as re:
                logger.error(f"Error publishing job update to Redis: {re}")
    except Exception as e:
        logger.error(f"Error updating job status in DB: {e}")
    finally:
        db.close()

def save_job_result(job_id: str, result_data: dict) -> str:
    """Save raw JSON job results to a local file accessible by the backend."""
    os.makedirs(RESULTS_DIR, exist_ok=True)
    file_path = os.path.join(RESULTS_DIR, f"{job_id}.json")
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(result_data, f, ensure_ascii=False, indent=2)
    # Return the relative backend route to access this result file
    return f"/api/v1/jobs/{job_id}/result"

@celery_app.task(bind=True, max_retries=3)
def process_aoi_task(self, job_id: str, search_params: dict):
    """Celery task to asynchronously query satellite scenes matching an AOI."""
    logger.info(f"Starting AOI search task for Job ID: {job_id}")
    update_job_status(job_id, "running", 10)
    try:
        update_job_status(job_id, "running", 40)
        from services.stac.search import search_stac_images
        results = search_stac_images(search_params)
        
        update_job_status(job_id, "running", 80)
        result_url = save_job_result(job_id, results)
        update_job_status(job_id, "completed", 100, result_url=result_url)
        return {"status": "completed", "result_url": result_url}
    except Exception as exc:
        logger.error(f"Error in AOI search task: {exc}")
        if self.request.retries < self.max_retries:
            update_job_status(job_id, "running", 50, error_message=f"Lỗi: {str(exc)}. Đang thử lại...")
            # Exponential backoff countdown
            delay = 5 * (2 ** self.request.retries)
            raise self.retry(exc=exc, countdown=delay)
        else:
            update_job_status(job_id, "failed", 100, error_message=f"Thất bại sau 3 lần thử. Chi tiết: {str(exc)}")
            raise exc

@celery_app.task(bind=True, max_retries=3)
def process_comparison_task(self, job_id: str, image_a_id: str, image_b_id: str):
    """Celery task to asynchronously query and build metadata comparison stats."""
    logger.info(f"Starting Comparison task for Job ID: {job_id} ({image_a_id} vs {image_b_id})")
    update_job_status(job_id, "running", 15)
    try:
        update_job_status(job_id, "running", 45)
        from services.stac.search import get_stac_items_by_ids
        items = get_stac_items_by_ids([image_a_id, image_b_id])
        
        items_map = {item.get("id"): item for item in items}
        item_a = items_map.get(image_a_id)
        item_b = items_map.get(image_b_id)
        
        if not item_a or not item_b:
            missing = []
            if not item_a: missing.append(image_a_id)
            if not item_b: missing.append(image_b_id)
            raise ValueError(f"Không tìm thấy dữ liệu ảnh vệ tinh cho các ID: {', '.join(missing)}")
            
        update_job_status(job_id, "running", 75)
        
        # Calculate comparison stats
        cloud_a = item_a.get("properties", {}).get("eo:cloud_cover", 0)
        cloud_b = item_b.get("properties", {}).get("eo:cloud_cover", 0)
        date_a_str = item_a.get("properties", {}).get("datetime", "")
        date_b_str = item_b.get("properties", {}).get("datetime", "")
        
        date_diff = None
        if date_a_str and date_b_str:
            try:
                # Replace 'Z' with UTC offset to parse correctly in python's fromisoformat
                d_a = datetime.datetime.fromisoformat(date_a_str.replace("Z", "+00:00"))
                d_b = datetime.datetime.fromisoformat(date_b_str.replace("Z", "+00:00"))
                date_diff = abs((d_b - d_a).days)
            except Exception as e:
                logger.error(f"Error parsing datetimes: {e}")
                pass
                
        comparison_results = {
            "imageA": item_a,
            "imageB": item_b,
            "stats": {
                "days_difference": date_diff,
                "cloud_cover_difference": cloud_b - cloud_a,
                "cloud_a": cloud_a,
                "cloud_b": cloud_b
            }
        }
        
        update_job_status(job_id, "running", 90)
        result_url = save_job_result(job_id, comparison_results)
        update_job_status(job_id, "completed", 100, result_url=result_url)
        return {"status": "completed", "result_url": result_url}
    except Exception as exc:
        logger.error(f"Error in Comparison task: {exc}")
        if self.request.retries < self.max_retries:
            update_job_status(job_id, "running", 50, error_message=f"Lỗi: {str(exc)}. Đang thử lại...")
            delay = 5 * (2 ** self.request.retries)
            raise self.retry(exc=exc, countdown=delay)
        else:
            update_job_status(job_id, "failed", 100, error_message=f"Thất bại sau 3 lần thử. Chi tiết: {str(exc)}")
            raise exc

@celery_app.task(bind=True, max_retries=3)
def process_detection_task(self, job_id: str, aoi_id: str, collection: str):
    """Celery task simulating YOLO object inference inside a given AOI boundaries."""
    logger.info(f"Starting simulated YOLO Detection task for Job ID: {job_id} (AOI: {aoi_id})")
    update_job_status(job_id, "running", 10)
    try:
        update_job_status(job_id, "running", 30)
        time.sleep(1.5)  # Simulate image loading
        
        update_job_status(job_id, "running", 60)
        time.sleep(1.5)  # Simulate neural network inference
        
        # Bbox format: [xmin, ymin, xmax, ymax] in geographic coordinates (simulated near Hanoi)
        simulated_detections = [
            {"class": "aircraft", "confidence": 0.94, "bbox": [105.8015, 21.0251, 105.8032, 21.0272]},
            {"class": "vehicle", "confidence": 0.89, "bbox": [105.8041, 21.0222, 105.8052, 21.0234]},
            {"class": "aircraft", "confidence": 0.91, "bbox": [105.8021, 21.0263, 105.8045, 21.0284]}
        ]
        
        update_job_status(job_id, "running", 80)
        
        # Save results file
        result_url = save_job_result(job_id, {"detections": simulated_detections})
        
        # Persist detections in the postgres database
        db = SessionLocal()
        try:
            from models.detection import Detection
            for det in simulated_detections:
                db_det = Detection(
                    id=uuid.uuid4(),
                    job_id=uuid.UUID(job_id),
                    object_class=det["class"],
                    confidence=det["confidence"],
                    bbox=det["bbox"]
                )
                db.add(db_det)
            db.commit()
            logger.info(f"Persisted {len(simulated_detections)} detections to PostgreSQL.")
        except Exception as e:
            logger.error(f"Error persisting detections to DB: {e}")
            db.rollback()
        finally:
            db.close()
            
        update_job_status(job_id, "completed", 100, result_url=result_url)
        return {"status": "completed", "result_url": result_url}
    except Exception as exc:
        logger.error(f"Error in Detection task: {exc}")
        if self.request.retries < self.max_retries:
            update_job_status(job_id, "running", 50, error_message=f"Lỗi: {str(exc)}. Đang thử lại...")
            delay = 5 * (2 ** self.request.retries)
            raise self.retry(exc=exc, countdown=delay)
        else:
            update_job_status(job_id, "failed", 100, error_message=f"Thất bại sau 3 lần thử. Chi tiết: {str(exc)}")
            raise exc
