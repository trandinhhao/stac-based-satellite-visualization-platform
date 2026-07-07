"""
Module dịch vụ quản lý Cache bằng Redis.
Cung cấp cơ chế lưu trữ Key-Value (dạng JSON) để tăng tốc độ truy vấn metadata STAC và giảm tải hệ thống.
"""

import os
import redis
import json

# Lấy cấu hình kết nối Redis từ biến môi trường
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

class RedisCache:
    """
    Lớp dịch vụ thực hiện các thao tác Get, Set, Delete khóa dữ liệu trong bộ nhớ RAM của Redis.
    Tự động chuyển đổi dữ liệu dạng đối tượng Python sang chuỗi JSON và ngược lại.
    """
    def __init__(self):
        try:
            self.client = redis.from_url(REDIS_URL, decode_responses=True)
        except Exception as e:
            print(f"Không thể kết nối đến máy chủ Redis: {e}")
            self.client = None

    def get(self, key: str):
        """
        Lấy giá trị từ Redis cache theo khóa chỉ định.
        Giải mã chuỗi JSON lấy được về đối tượng Python.
        """
        if not self.client:
            return None
        try:
            val = self.client.get(key)
            return json.loads(val) if val else None
        except Exception as e:
            print(f"Lỗi khi đọc cache Redis cho khóa '{key}': {e}")
            return None

    def set(self, key: str, value: any, expire_seconds: int = 3600):
        """
        Lưu dữ liệu vào Redis cache với thời gian hết hạn cụ thể (mặc định là 1 giờ).
        """
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
            print(f"Lỗi khi ghi cache Redis cho khóa '{key}': {e}")
            return False

    def delete(self, key: str):
        """
        Xóa một khóa dữ liệu cụ thể khỏi Redis cache.
        """
        if not self.client:
            return False
        try:
            self.client.delete(key)
            return True
        except Exception as e:
            print(f"Lỗi khi xóa cache Redis cho khóa '{key}': {e}")
            return False

# Tạo thực thể duy nhất (Singleton) sử dụng chung cho toàn ứng dụng
redis_cache = RedisCache()
