"""add_indexes

Revision ID: e7b99c3619db
Revises: c64796c397f4
Create Date: 2026-06-16 04:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e7b99c3619db'
down_revision: Union[str, Sequence[str], None] = 'c64796c397f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema by adding optimization indexes."""
    # 1. Normal Index on jobs(status) to speed up filtering on dashboards and state checks
    op.create_index('idx_jobs_status', 'jobs', ['status'])
    
    # 2. Spatial Index on aois(geometry) using GIST to speed up bounding box checks and STAC intersections
    op.execute("CREATE INDEX IF NOT EXISTS idx_aois_geometry ON aois USING GIST(geometry)")


def downgrade() -> None:
    """Downgrade schema by dropping indexes."""
    # 1. Drop jobs status index
    op.drop_index('idx_jobs_status', table_name='jobs')
    
    # 2. Drop aois spatial index
    op.execute("DROP INDEX idx_aois_geometry")
