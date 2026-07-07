"""Thêm các chỉ mục (indexes)

Revision ID: e7b99c3619db
Revises: c64796c397f4
Create Date: 2026-06-16 04:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# Các định danh phiên bản di trú, được sử dụng bởi Alembic.
revision: str = 'e7b99c3619db'
down_revision: Union[str, Sequence[str], None] = 'c64796c397f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Nâng cấp lược đồ bằng cách thêm các chỉ mục tối ưu hóa."""
    # 1. Chỉ mục thông thường trên cột jobs(status) để tăng tốc bộ lọc bảng điều khiển và kiểm tra trạng thái
    op.create_index('idx_jobs_status', 'jobs', ['status'])
    
    # 2. Chỉ mục không gian trên cột aois(geometry) sử dụng GIST để tăng tốc độ kiểm tra bounding box và giao cắt STAC
    op.execute("CREATE INDEX IF NOT EXISTS idx_aois_geometry ON aois USING GIST(geometry)")


def downgrade() -> None:
    """Hạ cấp lược đồ bằng cách xóa các chỉ mục."""
    # 1. Xóa chỉ mục trạng thái của jobs
    op.drop_index('idx_jobs_status', table_name='jobs')
    
    # 2. Xóa chỉ mục không gian của aois
    op.execute("DROP INDEX idx_aois_geometry")
