"""add analytics and media tables

Revision ID: a1d2c3e4f5a6
Revises: 8c053d5f0a83
Create Date: 2026-02-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "a1d2c3e4f5a6"
down_revision: Union[str, Sequence[str], None] = "8c053d5f0a83"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # engagement_metrics
    op.create_table(
        "engagement_metrics",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("article_id", sa.Integer(), nullable=True),
        sa.Column("platform", sa.String(), nullable=True),
        sa.Column("metric_type", sa.String(), nullable=False),
        sa.Column("metric_value", sa.Float(), nullable=False, server_default=sa.text("1")),
        sa.Column(
            "recorded_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["article_id"], ["processed_articles.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_engagement_article_type",
        "engagement_metrics",
        ["article_id", "metric_type"],
        unique=False,
    )

    # user_styles
    op.create_table(
        "user_styles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("key", sa.String(), nullable=False),
        sa.Column("value", sa.String(), nullable=False),
        sa.Column(
            "last_updated",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key"),
    )

    # article_images
    op.create_table(
        "article_images",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("article_id", sa.Integer(), nullable=False),
        sa.Column("image_url", sa.String(), nullable=True),
        sa.Column("local_path", sa.String(), nullable=True),
        sa.Column("media_type", sa.String(), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=True),
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
        "idx_article_images_article", "article_images", ["article_id"], unique=False
    )

    # article_audio
    op.create_table(
        "article_audio",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("article_id", sa.Integer(), nullable=False),
        sa.Column("audio_url", sa.String(), nullable=True),
        sa.Column("local_path", sa.String(), nullable=True),
        sa.Column("voice", sa.String(), nullable=True),
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
        "idx_article_audio_article", "article_audio", ["article_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index("idx_article_audio_article", table_name="article_audio")
    op.drop_table("article_audio")
    op.drop_index("idx_article_images_article", table_name="article_images")
    op.drop_table("article_images")
    op.drop_table("user_styles")
    op.drop_index(
        "idx_engagement_article_type", table_name="engagement_metrics"
    )
    op.drop_table("engagement_metrics")

