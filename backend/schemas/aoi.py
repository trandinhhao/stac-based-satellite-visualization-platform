"""
Cấu hình schema Pydantic cho đối tượng AOI (Area of Interest).
Thực hiện xác thực dữ liệu đầu vào và định nghĩa cấu trúc dữ liệu trả về cho API quản lý vùng AOI.
"""

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime

class AOIBase(BaseModel):
    """
    Schema cơ sở chứa các trường thông tin cơ bản của vùng AOI.
    """
    name: str = Field(..., max_length=255, description="Tên vùng quan tâm (AOI)")
    description: Optional[str] = Field(None, description="Mô tả chi tiết về vùng AOI")
    geometry: Dict[str, Any] = Field(..., description="Dữ liệu địa lý GeoJSON của đa giác AOI (Polygon)")

class AOICreate(AOIBase):
    """
    Schema sử dụng khi gửi yêu cầu tạo mới vùng AOI.
    """
    pass

class AOIUpdate(BaseModel):
    """
    Schema sử dụng khi gửi yêu cầu cập nhật thông tin vùng AOI.
    Cho phép cập nhật từng trường không bắt buộc.
    """
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    geometry: Optional[Dict[str, Any]] = None

class AOIResponse(BaseModel):
    """
    Schema cấu trúc dữ liệu trả về từ API đại diện cho thông tin AOI.
    Bao gồm thêm diện tích (m2), chu vi (m) và thời gian tạo lập.
    """
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: Optional[str]
    geometry: Dict[str, Any]
    area: Optional[float] = None
    perimeter: Optional[float] = None
    created_at: datetime
    updated_at: datetime
