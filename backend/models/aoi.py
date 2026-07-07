"""
Module định nghĩa cấu trúc bảng dữ liệu AOI (Area of Interest).
Tích hợp kiểu dữ liệu hình học đa giác PostGIS GEOMETRY(POLYGON, 4326) để tính toán diện tích và chu vi.
"""

import datetime
import uuid
from sqlalchemy import Column, String, DateTime, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.types import UserDefinedType
from db.database import Base

class Geometry(UserDefinedType):
    """
    Kiểu dữ liệu tùy chỉnh của SQLAlchemy đại diện cho trường GEOMETRY(POLYGON, 4326) của PostGIS.
    """
    def get_col_spec(self, **kw):
        return "GEOMETRY(POLYGON, 4326)"

class AOI(Base):
    """
    Model ánh xạ tới bảng 'aois' trong cơ sở dữ liệu.
    Lưu trữ các vùng quan tâm của người dùng kèm thông tin địa lý và diện tích đo đạc.
    """
    __tablename__ = "aois"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    geometry = Column(Geometry, nullable=False)
    area = Column(Float, nullable=True)             # Diện tích tính bằng mét vuông (m2)
    perimeter = Column(Float, nullable=True)        # Chu vi tính bằng mét (m)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
