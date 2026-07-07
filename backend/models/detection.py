"""
Module định nghĩa cấu trúc bảng 'detections' lưu trữ các kết quả nhận diện đối tượng AI.
Lưu giữ thông tin về lớp đối tượng, độ tin cậy và tọa độ địa lý bounding box của các vật thể phát hiện được.
"""

import datetime
import uuid
from sqlalchemy import Column, String, DateTime, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from db.database import Base

class Detection(Base):
    """
    Model ánh xạ tới bảng 'detections' trong cơ sở dữ liệu.
    Lưu trữ kết quả tọa độ vị trí của Máy bay, Tàu biển và Xe cộ được nhận diện sau mỗi lượt quét AI.
    """
    __tablename__ = "detections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), nullable=False)                         # ID liên kết tới Job xử lý nền
    object_class = Column(String(100), nullable=False)                         # Lớp đối tượng nhận diện (aircraft, ship, vehicle)
    confidence = Column(Float, nullable=False)                                  # Độ tin cậy (từ 0.0 đến 1.0)
    bbox = Column(JSONB, nullable=False)  # Tọa độ khung giới hạn địa lý dạng JSON [xmin, ymin, xmax, ymax]
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
