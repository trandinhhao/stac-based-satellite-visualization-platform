import datetime
import uuid
from sqlalchemy import Column, String, DateTime, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.types import UserDefinedType
from db.database import Base

class Geometry(UserDefinedType):
    """Custom SQLAlchemy type for PostGIS POLYGON geometry."""
    def get_col_spec(self, **kw):
        return "GEOMETRY(POLYGON, 4326)"

class AOI(Base):
    __tablename__ = "aois"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    geometry = Column(Geometry, nullable=False)
    area = Column(Float, nullable=True)
    perimeter = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
