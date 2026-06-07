import os
from fastapi import FastAPI
from sqlalchemy import create_engine, text
import redis
import aio_pika

app = FastAPI(title="STAC Satellite Platform Backend API")

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