"""add_missing_performance_indexes

Revision ID: b786ebfd057b
Revises: e84c51770a42
Create Date: 2026-02-24 20:12:36.719500

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b786ebfd057b'
down_revision: Union[str, Sequence[str], None] = 'e84c51770a42'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add missing performance indexes."""
    # Create indexes if they don't exist
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_raw_articles_source 
        ON raw_articles(source);
    """)
    
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_processed_articles_viral_score 
        ON processed_articles(viral_score);
    """)
    
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_article_tags_article_id 
        ON article_tags(article_id);
    """)
    
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_article_tags_tag 
        ON article_tags(tag);
    """)


def downgrade() -> None:
    """Remove the added indexes."""
    op.execute("DROP INDEX IF EXISTS idx_raw_articles_source;")
    op.execute("DROP INDEX IF EXISTS idx_processed_articles_viral_score;")
    op.execute("DROP INDEX IF EXISTS idx_article_tags_article_id;")
    op.execute("DROP INDEX IF EXISTS idx_article_tags_tag;")
