"""add platform to user_styles and relevance_keywords table

Revision ID: c4f8a9b2e371
Revises: b3f4a5c6d7e8
Create Date: 2026-05-09 20:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4f8a9b2e371'
down_revision: Union[str, Sequence[str], None] = 'b3f4a5c6d7e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # ── 1. Add 'platform' column to user_styles (if not already present) ──
    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = 'user_styles' AND column_name = 'platform'"
    ))
    if result.fetchone() is None:
        op.add_column('user_styles', sa.Column(
            'platform', sa.String(50), server_default='generic', nullable=False
        ))
        op.create_index('idx_user_styles_platform', 'user_styles', ['platform'])

    # ── 2. Drop old unique constraint on key alone (if it exists) ──
    # The init.sql created: key VARCHAR UNIQUE NOT NULL
    # We need (platform, key) unique instead.
    try:
        op.drop_constraint('user_styles_key_key', 'user_styles', type_='unique')
    except Exception:
        pass  # Constraint may not exist or have a different name

    # ── 3. Create composite unique constraint ──
    try:
        op.create_unique_constraint('uq_platform_key', 'user_styles', ['platform', 'key'])
    except Exception:
        pass  # May already exist if migration ran partially

    # ── 4. Create relevance_keywords table (if not exists) ──
    result = conn.execute(sa.text(
        "SELECT to_regclass('public.relevance_keywords')"
    ))
    if result.scalar() is None:
        op.create_table(
            'relevance_keywords',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('keyword', sa.String(), unique=True, nullable=False),
            sa.Column('category', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
        )
        op.create_index('idx_relevance_keywords_keyword', 'relevance_keywords', ['keyword'])


def downgrade() -> None:
    # Drop relevance_keywords
    op.drop_index('idx_relevance_keywords_keyword', table_name='relevance_keywords')
    op.drop_table('relevance_keywords')

    # Reverse user_styles changes
    op.drop_constraint('uq_platform_key', 'user_styles', type_='unique')
    op.drop_index('idx_user_styles_platform', table_name='user_styles')
    op.drop_column('user_styles', 'platform')
    op.create_unique_constraint('user_styles_key_key', 'user_styles', ['key'])
