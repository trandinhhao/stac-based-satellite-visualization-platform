from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime

class AOIBase(BaseModel):
    name: str = Field(..., max_length=255, description="Name of the Area of Interest")
    description: Optional[str] = Field(None, description="Description of the AOI")
    geometry: Dict[str, Any] = Field(..., description="GeoJSON geometry of the AOI (Polygon)")

class AOICreate(AOIBase):
    pass

class AOIUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    geometry: Optional[Dict[str, Any]] = None

class AOIResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: Optional[str]
    geometry: Dict[str, Any]
    area: Optional[float] = None
    perimeter: Optional[float] = None
    created_at: datetime
    updated_at: datetime
