"""fix_system_status_drift

Revision ID: 0e1f90079a01
Revises: cf9ab5967e77
Create Date: 2026-02-21 20:21:43.601587

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0e1f90079a01'
down_revision: Union[str, Sequence[str], None] = 'cf9ab5967e77'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema (column already exists in production PG)."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('system_status', 'updated_at')
