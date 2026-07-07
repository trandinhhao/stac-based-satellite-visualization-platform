"""
Tệp khởi chạy chính của ứng dụng FastAPI.
Cấu hình các router, khởi tạo tác vụ nền lắng nghe Redis Pub/Sub,
và khai báo các endpoint kiểm tra trạng thái sức khỏe (health checks) cho hệ thống.
"""

import os
import asyncio
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlalchemy import create_engine, text
import redis
import redis.asyncio as aioredis
import aio_pika

# Nhập các router API từ các module tương ứng
from api.stac import router as stac_router
from api.aois import router as aois_router
from api.measure import router as measure_router
from api.jobs import router as jobs_router
from api.detections import router as detections_router
from api.websocket import router as ws_router, manager as ws_manager

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

async def redis_pubsub_listener():
    """
    Tác vụ chạy ẩn dưới nền (background task) đăng ký kênh 'job_updates' của Redis Pub/Sub
    và broadcast các thông tin tiến độ tới toàn bộ kết nối WebSocket đang hoạt động.
    """
    while True:
        try:
            client = aioredis.from_url(
                REDIS_URL, 
                decode_responses=True,
                socket_timeout=None,
                health_check_interval=30
            )
            pubsub = client.pubsub()
            await pubsub.subscribe("job_updates")
            print("[WebSocket Listener] Đã đăng ký lắng nghe kênh Redis 'job_updates'")
            
            while True:
                try:
                    message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                    if message and message.get("type") == "message":
                        try:
                            data = json.loads(message["data"])
                            # Broadcast dữ liệu tiến trình đến toàn bộ client WebSocket
                            await ws_manager.broadcast(data)
                        except Exception as e:
                            print(f"[WebSocket Listener] Lỗi phát sóng dữ liệu: {e}")
                    await asyncio.sleep(0.01)
                except asyncio.CancelledError:
                    raise
                except Exception as e:
                    # Lỗi đọc tạm thời hoặc hết thời gian chờ - tiếp tục vòng lặp mà không hủy đăng ký kênh
                    await asyncio.sleep(0.1)
        except asyncio.CancelledError:
            print("[WebSocket Listener] Tác vụ lắng nghe bị hủy, đang thoát...")
            break
        except Exception as e:
            print(f"[WebSocket Listener] Mất kết nối tới Redis: {e}. Đang thử lại sau 2 giây...")
            await asyncio.sleep(2)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi động: Bắt đầu chạy ngầm tác vụ lắng nghe kênh Redis Pub/Sub
    listener_task = asyncio.create_task(redis_pubsub_listener())
    yield
    # Tắt ứng dụng: Hủy tác vụ chạy ngầm lắng nghe
    listener_task.cancel()
    try:
        await listener_task
    except asyncio.CancelledError:
        pass

app = FastAPI(title="STAC Satellite Platform Backend API", lifespan=lifespan)

# Khai báo các route endpoints với tiền tố chuẩn hóa /api/v1
app.include_router(stac_router, prefix="/api/v1")
app.include_router(aois_router, prefix="/api/v1")
app.include_router(measure_router, prefix="/api/v1")
app.include_router(jobs_router, prefix="/api/v1")
app.include_router(detections_router, prefix="/api/v1")
app.include_router(ws_router, prefix="")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgis:5432/postgis")
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672//")

@app.get("/health")
@app.get("/api/v1/health")
def health():
    """Kiểm tra sức khỏe cơ bản của dịch vụ API."""
    return {
        "status": "ok",
        "version": "v1"
    }

@app.get("/health/db")
def health_db():
    """Kiểm tra trạng thái kết nối tới cơ sở dữ liệu PostgreSQL."""
    try:
        engine = create_engine(DATABASE_URL, connect_args={"connect_timeout": 5})
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "connected"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }

@app.get("/health/redis")
def health_redis():
    """Kiểm tra trạng thái kết nối tới dịch vụ cache/pubsub Redis."""
    try:
        r = redis.from_url(REDIS_URL, socket_connect_timeout=5)
        if r.ping():
            return {
                "status": "healthy",
                "redis": "connected"
            }
        else:
            return {
                "status": "unhealthy",
                "error": "Phản hồi Ping từ Redis không hợp lệ"
            }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }

@app.get("/health/rabbitmq")
async def health_rabbitmq():
    """Kiểm tra trạng thái kết nối tới hàng chờ tác vụ RabbitMQ."""
    try:
        connection = await aio_pika.connect_robust(RABBITMQ_URL, timeout=5)
        await connection.close()
        return {
            "status": "healthy",
            "rabbitmq": "connected"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }