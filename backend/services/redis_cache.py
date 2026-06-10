import os
import redis
import json

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

class RedisCache:
    def __init__(self):
        try:
            self.client = redis.from_url(REDIS_URL, decode_responses=True)
        except Exception as e:
            print(f"Failed to connect to Redis: {e}")
            self.client = None

    def get(self, key: str):
        if not self.client:
            return None
        try:
            val = self.client.get(key)
            return json.loads(val) if val else None
        except Exception as e:
            print(f"Redis get error for key {key}: {e}")
            return None

    def set(self, key: str, value: any, expire_seconds: int = 3600):
        if not self.client:
            return False
        try:
            self.client.set(
                name=key,
                value=json.dumps(value),
                ex=expire_seconds
            )
            return True
        except Exception as e:
            print(f"Redis set error for key {key}: {e}")
            return False

    def delete(self, key: str):
        if not self.client:
            return False
        try:
            self.client.delete(key)
            return True
        except Exception as e:
            print(f"Redis delete error for key {key}: {e}")
            return False

# Singleton instance
redis_cache = RedisCache()
