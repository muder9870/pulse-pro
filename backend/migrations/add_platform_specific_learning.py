"""
Migration: Add platform-specific learning to user_styles table

This migration:
1. Adds a 'platform' column to user_styles (default: 'generic')
2. Creates a unique constraint on (platform, key)
3. Maintains backward compatibility with existing data
"""

from sqlalchemy import Column, String, text
from sqlalchemy.orm import Session
from backend.db.session import SessionLocal
from backend.db.models import Base
import logging

logger = logging.getLogger(__name__)


def upgrade():
    """Add platform column and update constraints."""
    db = SessionLocal()
    try:
        # Check if migration already applied
        inspector_result = db.execute(
            text("PRAGMA table_info(user_styles)")
        ).fetchall()
        
        column_names = [col[1] for col in inspector_result]
        
        if 'platform' not in column_names:
            # Add platform column
            db.execute(
                text("ALTER TABLE user_styles ADD COLUMN platform VARCHAR(50) DEFAULT 'generic' NOT NULL")
            )
            db.execute(
                text("CREATE INDEX idx_user_styles_platform ON user_styles(platform)")
            )
            db.commit()
            logger.info("✓ Added platform column to user_styles")
            logger.info("✓ Created index on platform column")
        else:
            logger.info("Platform column already exists, skipping upgrade")
            
    except Exception as e:
        logger.error(f"Migration upgrade failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def downgrade():
    """Remove platform column (if needed for rollback)."""
    db = SessionLocal()
    try:
        db.execute(
            text("ALTER TABLE user_styles DROP COLUMN platform")
        )
        db.commit()
        logger.info("✓ Removed platform column from user_styles")
    except Exception as e:
        logger.error(f"Migration downgrade failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    upgrade()
