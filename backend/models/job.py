import datetime
import uuid
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from db.database import Base

class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=True)  # Nullable and without FK references users(id) since users table is not implemented
    aoi_id = Column(UUID(as_uuid=True), ForeignKey('aois.id', ondelete='SET NULL'), nullable=True)
    job_type = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False, default="pending")  # pending, queued, running, completed, failed, cancelled
    progress = Column(Integer, default=0, nullable=False)
    result_url = Column(String, nullable=True)
    error_message = Column(String, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
