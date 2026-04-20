"""Add story pipeline columns on processed_articles

Revision ID: b3f4a5c6d7e8
Revises: a1b2c3d4e5f6
Create Date: 2026-04-19 12:00:00.000000

Supports StoryCard / PATCH pipeline workflow (review_status, needs_review, etc.).
Idempotent: skips columns that already exist (Docker init.sql + repeat runs).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "b3f4a5c6d7e8"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table: str, column: str) -> bool:
    bind = op.get_bind()
    insp = inspect(bind)
    return column in [col["name"] for col in insp.get_columns(table)]


def upgrade() -> None:
    if not _column_exists("processed_articles", "story_review_status"):
        op.add_column(
            "processed_articles",
            sa.Column(
                "story_review_status",
                sa.String(length=32),
                server_default="none",
                nullable=False,
            ),
        )
    if not _column_exists("processed_articles", "content_approved"):
        op.add_column(
            "processed_articles",
            sa.Column(
                "content_approved",
                sa.Boolean(),
                server_default=sa.text("false"),
                nullable=False,
            ),
        )
    if not _column_exists("processed_articles", "pipeline_needs_review"):
        op.add_column(
            "processed_articles",
            sa.Column(
                "pipeline_needs_review",
                sa.Boolean(),
                server_default=sa.text("false"),
                nullable=False,
            ),
        )
    if not _column_exists("processed_articles", "ready_to_schedule"):
        op.add_column(
            "processed_articles",
            sa.Column(
                "ready_to_schedule",
                sa.Boolean(),
                server_default=sa.text("false"),
                nullable=False,
            ),
        )


def downgrade() -> None:
    if _column_exists("processed_articles", "ready_to_schedule"):
        op.drop_column("processed_articles", "ready_to_schedule")
    if _column_exists("processed_articles", "pipeline_needs_review"):
        op.drop_column("processed_articles", "pipeline_needs_review")
    if _column_exists("processed_articles", "content_approved"):
        op.drop_column("processed_articles", "content_approved")
    if _column_exists("processed_articles", "story_review_status"):
        op.drop_column("processed_articles", "story_review_status")
