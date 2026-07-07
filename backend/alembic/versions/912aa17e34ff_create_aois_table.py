"""Tạo bảng aois

Revision ID: 912aa17e34ff
Revises: 
Create Date: 2026-06-10 12:10:42.349914

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import models.aoi

# Các định danh phiên bản di trú, được sử dụng bởi Alembic.
revision: str = '912aa17e34ff'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('aois',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('description', sa.String(), nullable=True),
    sa.Column('geometry', models.aoi.Geometry(), nullable=False),
    sa.Column('area', sa.Float(), nullable=True),
    sa.Column('perimeter', sa.Float(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_aois_geometry', 'aois', ['geometry'], unique=False, postgresql_using='gist')


def downgrade() -> None:
    op.drop_index('idx_aois_geometry', table_name='aois')
    op.drop_table('aois')
