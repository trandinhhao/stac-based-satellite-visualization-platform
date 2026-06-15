import os
import asyncio
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlalchemy import create_engine, text
import redis
import redis.asyncio as aioredis
import aio_pika

from api.stac import router as stac_router
from api.aois import router as aois_router
from api.measure import router as measure_router
from api.compare import router as compare_router
from api.jobs import router as jobs_router
from api.detections import router as detections_router
from api.websocket import router as ws_router, manager as ws_manager

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

async def redis_pubsub_listener():
    """Background task subscribing to Redis Pub/Sub and broadcasting updates to WebSocket connections."""
    while True:
        try:
            client = aioredis.from_url(REDIS_URL, decode_responses=True)
            pubsub = client.pubsub()
            await pubsub.subscribe("job_updates")
            print("[WebSocket Listener] Subscribed to Redis channel 'job_updates'")
            async for message in pubsub.listen():
                if message and message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        await ws_manager.broadcast(data)
                    except Exception as e:
                        print(f"[WebSocket Listener] Error broadcasting data: {e}")
        except asyncio.CancelledError:
            print("[WebSocket Listener] Task cancelled, exiting...")
            break
        except Exception as e:
            print(f"[WebSocket Listener] Redis listener connection lost: {e}. Retrying in 5s...")
            await asyncio.sleep(5)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start Redis Pub/Sub listener task
    listener_task = asyncio.create_task(redis_pubsub_listener())
    yield
    # Shutdown: Cancel the task
    listener_task.cancel()
    try:
        await listener_task
    except asyncio.CancelledError:
        pass

app = FastAPI(title="STAC Satellite Platform Backend API", lifespan=lifespan)

app.include_router(stac_router, prefix="/api")
app.include_router(aois_router, prefix="/api")
app.include_router(measure_router, prefix="/api")
app.include_router(compare_router, prefix="/api")
app.include_router(jobs_router, prefix="/api/v1")
app.include_router(detections_router, prefix="/api/v1")
app.include_router(ws_router, prefix="")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgis:5432/postgis")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672//")

@app.get("/health")
def health():
    return {
        "status": "ok"
    }

@app.get("/health/db")
def health_db():
    try:
        # Create engine with a connection timeout
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
    try:
        # Connect to Redis and ping it
        r = redis.from_url(REDIS_URL, socket_connect_timeout=5)
        if r.ping():
            return {
                "status": "healthy",
                "redis": "connected"
            }
        else:
            return {
                "status": "unhealthy",
                "error": "Ping response was invalid"
            }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }

@app.get("/health/rabbitmq")
async def health_rabbitmq():
    try:
        # Connect to RabbitMQ using the async aio-pika client
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