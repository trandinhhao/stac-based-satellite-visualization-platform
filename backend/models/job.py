"""
Module định nghĩa cấu trúc bảng 'jobs' lưu trữ các tác vụ nền Celery.
Theo dõi tiến trình xử lý nhận diện đối tượng AI từ khi bắt đầu cho đến khi hoàn thành hoặc lỗi.
"""

import datetime
import uuid
from sqlalchemy import Column, String, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID
from db.database import Base

class Job(Base):
    """
    Model ánh xạ tới bảng 'jobs' trong cơ sở dữ liệu.
    Quản lý các tác vụ nền, trạng thái (pending, running, completed...), tiến độ % và thông báo lỗi.
    """
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=True)  # Không sử dụng khóa ngoại do bảng users chưa triển khai
    aoi_id = Column(UUID(as_uuid=True), nullable=True)
    job_type = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False, default="pending")  # Trạng thái: pending, queued, running, completed, failed, cancelled
    progress = Column(Integer, default=0, nullable=False)           # Tiến độ % thực thi của tác vụ
    result_url = Column(String, nullable=True)                      # URL trỏ tới kết quả sau khi hoàn thành
    error_message = Column(String, nullable=True)                   # Lưu vết thông tin lỗi nếu có
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
