"""
Cấu hình ứng dụng Celery.
Thiết lập RabbitMQ làm hàng đợi tin nhắn (broker) và Redis làm lưu trữ trạng thái kết quả (backend).
"""

import os
import sys

# Đảm bảo đường dẫn /app nằm trong Python path để worker có thể import các dịch vụ và models
if '/app' not in sys.path:
    sys.path.insert(0, '/app')

from celery import Celery

# Cấu hình URL kết nối từ các biến môi trường
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672//")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

# Khởi tạo thực thể ứng dụng Celery
celery_app = Celery(
    "tasks",
    broker=RABBITMQ_URL,
    backend=REDIS_URL,
    include=["workers.tasks"]
)

# Cấu hình định dạng truyền nhận dữ liệu và thời gian hết hạn của kết quả
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    result_expires=86400,  # Kết quả tác vụ tự động hết hạn và xóa sau 24 giờ
)
