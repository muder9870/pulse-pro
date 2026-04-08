"""add video_scripts table for media features

Revision ID: c8d9e0f1a2b3
Revises: b7c4a1d2f3e4
Create Date: 2026-02-23 02:30:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "c8d9e0f1a2b3"
down_revision: Union[str, Sequence[str], None] = "b7c4a1d2f3e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "video_scripts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("article_id", sa.Integer(), nullable=False),
        sa.Column("platform", sa.String(), nullable=False),
        sa.Column("script_text", sa.Text(), nullable=False),
        sa.Column("visual_cues", sa.Text(), nullable=True),
        sa.Column("duration_est", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["article_id"], ["processed_articles.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_video_scripts_article", "video_scripts", ["article_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index("idx_video_scripts_article", table_name="video_scripts")
    op.drop_table("video_scripts")

