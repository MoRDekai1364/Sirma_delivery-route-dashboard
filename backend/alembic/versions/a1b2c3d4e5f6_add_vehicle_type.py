"""add vehicle_type to vehicles

Revision ID: a1b2c3d4e5f6
Revises: ce9c9242d381
Create Date: 2026-08-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'ce9c9242d381'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('vehicles', sa.Column('vehicle_type', sa.String(), server_default='van', nullable=True))


def downgrade() -> None:
    op.drop_column('vehicles', 'vehicle_type')