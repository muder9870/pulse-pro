"""Add UNIQUE constraint on processed_articles.raw_article_id

Revision ID: a1b2c3d4e5f6
Revises: e0200254fe79
Create Date: 2026-03-28 09:00:00.000000

Root cause:  _save_analysis() previously inserted blindly on every retry,
             creating N rows per RawArticle.  The ORM relationship
             (uselist=False) then emitted:
               SAWarning: Multiple rows returned with uselist=False for
               RawArticle.processed_entry
             This migration:
               1. Removes all duplicate rows – keeping the one with the
                  HIGHEST id (most recent analysis) per raw_article_id.
               2. Adds a UNIQUE constraint so the DB enforces 1-to-1
                  permanently, making the ORM warning impossible.

Safe to run on a live DB: the DELETE uses a subquery that only touches
duplicate rows; rows without a duplicate are untouched.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "dc2d6182816f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------ #
    # Step 1: Remove duplicate processed_articles rows.
    #
    # For every raw_article_id that has more than one processed_articles
    # row, we keep the row with the greatest id (= most recent insert)
    # and delete all older duplicates.
    #
    # The DELETE … USING pattern is PostgreSQL-specific and executes in a
    # single pass — no temporary tables required.
    # ------------------------------------------------------------------ #
    op.execute(
        """
        DELETE FROM processed_articles
        WHERE id IN (
            SELECT id
            FROM (
                SELECT
                    id,
                    ROW_NUMBER() OVER (
                        PARTITION BY raw_article_id
                        ORDER BY id DESC   -- keep the greatest id (latest)
                    ) AS rn
                FROM processed_articles
            ) ranked
            WHERE rn > 1
        );
        """
    )

    # ------------------------------------------------------------------ #
    # Step 2: Add the UNIQUE constraint.
    #
    # After Step 1 there is at most one row per raw_article_id, so this
    # will never fail.  We use a named constraint so we can drop it
    # cleanly in downgrade().
    # ------------------------------------------------------------------ #
    op.create_unique_constraint(
        "uq_processed_articles_raw_article_id",
        "processed_articles",
        ["raw_article_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_processed_articles_raw_article_id",
        "processed_articles",
        type_="unique",
    )
    # We cannot restore deleted duplicate rows — that data is gone.
    # The constraint removal is the only reversible part of this migration.
