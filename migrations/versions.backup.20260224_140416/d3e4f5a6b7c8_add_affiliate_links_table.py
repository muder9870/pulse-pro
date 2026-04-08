"""add affiliate_links table

Revision ID: d3e4f5a6b7c8
Revises: c8d9e0f1a2b3
Create Date: 2026-02-23 02:35:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "d3e4f5a6b7c8"
down_revision: Union[str, Sequence[str], None] = "c8d9e0f1a2b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "affiliate_links",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("keyword", sa.String(), nullable=False),
        sa.Column("url", sa.String(), nullable=False),
        sa.Column("usage_count", sa.Integer(), nullable=True, server_default=sa.text("0")),
        sa.Column("last_used", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("keyword"),
    )


def downgrade() -> None:
    op.drop_table("affiliate_links")

