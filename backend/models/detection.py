import datetime
import uuid
from sqlalchemy import Column, String, DateTime, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from db.database import Base

class Detection(Base):
    __tablename__ = "detections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), nullable=False)
    object_class = Column(String(100), nullable=False)
    confidence = Column(Float, nullable=False)
    bbox = Column(JSONB, nullable=False)  # Bounding box coordinates [xmin, ymin, xmax, ymax]
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
