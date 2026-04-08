"""add user_feedback table and audio duration column

Revision ID: b7c4a1d2f3e4
Revises: a1d2c3e4f5a6
Create Date: 2026-02-23 02:25:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "b7c4a1d2f3e4"
down_revision: Union[str, Sequence[str], None] = "a1d2c3e4f5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("article_audio", sa.Column("duration", sa.Integer(), nullable=True))
    op.create_table(
        "user_feedback",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("article_id", sa.Integer(), nullable=False),
        sa.Column("platform", sa.String(), nullable=False),
        sa.Column("is_positive", sa.Boolean(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("original_content", sa.Text(), nullable=True),
        sa.Column("edited_content", sa.Text(), nullable=True),
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
        "idx_user_feedback_article", "user_feedback", ["article_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index("idx_user_feedback_article", table_name="user_feedback")
    op.drop_table("user_feedback")
    op.drop_column("article_audio", "duration")

