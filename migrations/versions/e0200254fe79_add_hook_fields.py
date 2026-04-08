"""add_hook_fields

Revision ID: e0200254fe79
Revises: b786ebfd057b
Create Date: 2026-03-17 20:09:29.180231

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'e0200254fe79'
down_revision: Union[str, Sequence[str], None] = 'b786ebfd057b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table: str, column: str) -> bool:
    """Return True if the column already exists in the table."""
    bind = op.get_bind()
    insp = inspect(bind)
    return column in [col["name"] for col in insp.get_columns(table)]


def upgrade() -> None:
    """Upgrade schema — idempotent: skips columns that already exist."""
    if not _column_exists("processed_articles", "viral_hook"):
        op.add_column("processed_articles", sa.Column("viral_hook", sa.Text(), server_default="", nullable=False))

    if not _column_exists("processed_articles", "key_innovation"):
        op.add_column("processed_articles", sa.Column("key_innovation", sa.Text(), server_default="", nullable=False))

    if not _column_exists("processed_articles", "implication"):
        op.add_column("processed_articles", sa.Column("implication", sa.Text(), server_default="", nullable=False))

    # alter_column is safe to run even if the column already has the target type
    op.alter_column("raw_articles", "retry_count",
                    existing_type=sa.INTEGER(),
                    nullable=False,
                    existing_server_default=sa.text("0"))

    op.alter_column("raw_articles", "retry_after",
                    existing_type=postgresql.TIMESTAMP(timezone=True),
                    type_=sa.DateTime(),
                    existing_nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column("raw_articles", "retry_after",
                    existing_type=sa.DateTime(),
                    type_=postgresql.TIMESTAMP(timezone=True),
                    existing_nullable=True)
    op.alter_column("raw_articles", "retry_count",
                    existing_type=sa.INTEGER(),
                    nullable=True,
                    existing_server_default=sa.text("0"))
    op.drop_column("processed_articles", "implication")
    op.drop_column("processed_articles", "key_innovation")
    op.drop_column("processed_articles", "viral_hook")
