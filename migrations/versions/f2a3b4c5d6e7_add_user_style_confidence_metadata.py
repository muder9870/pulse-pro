"""add_user_style_confidence_metadata

Revision ID: f2a3b4c5d6e7
Revises: c4f8a9b2e371
Create Date: 2026-05-10 21:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f2a3b4c5d6e7'
down_revision: Union[str, Sequence[str], None] = 'c4f8a9b2e371'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add confidence, occurrences, and last_seen columns to user_styles."""
    conn = op.get_bind()
    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = 'user_styles' AND column_name = 'confidence'"
    ))
    if result.fetchone() is None:
        op.add_column(
            'user_styles',
            sa.Column('confidence', sa.Float(), nullable=False, server_default=sa.text('0.5'))
        )

    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = 'user_styles' AND column_name = 'occurrences'"
    ))
    if result.fetchone() is None:
        op.add_column(
            'user_styles',
            sa.Column('occurrences', sa.Integer(), nullable=False, server_default=sa.text('1'))
        )

    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = 'user_styles' AND column_name = 'last_seen'"
    ))
    if result.fetchone() is None:
        op.add_column(
            'user_styles',
            sa.Column('last_seen', sa.DateTime(), nullable=False, server_default=sa.text('NOW()'))
        )


def downgrade() -> None:
    """Remove confidence, occurrences, and last_seen columns from user_styles."""
    op.drop_column('user_styles', 'last_seen')
    op.drop_column('user_styles', 'occurrences')
    op.drop_column('user_styles', 'confidence')
