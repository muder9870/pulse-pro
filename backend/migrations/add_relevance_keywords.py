"""
Add relevance_keywords table for configurable keyword-based relevance scoring.

This migration creates the relevance_keywords table which stores keywords
used to boost article relevance scores during the analysis pipeline.

Requirements: 4.1
"""

import sqlite3
import logging
from backend.config import settings

log = logging.getLogger("migrations")


def upgrade():
    """Create the relevance_keywords table and its index."""
    db_path = settings.DB_PATH

    if not db_path.exists():
        log.error(f"Database not found at {db_path}")
        return False

    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()

        # Create the table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS relevance_keywords (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                keyword  VARCHAR NOT NULL UNIQUE,
                category VARCHAR,
                created_at DATETIME DEFAULT (datetime('now')),
                updated_at DATETIME DEFAULT (datetime('now'))
            )
        """)
        log.info("Created table: relevance_keywords")

        # Create index on keyword column
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_relevance_keywords_keyword
            ON relevance_keywords (keyword)
        """)
        log.info("Created index: idx_relevance_keywords_keyword")

        conn.commit()
        conn.close()

        log.info("Migration upgrade complete: relevance_keywords table ready")
        return True

    except Exception as e:
        log.error(f"Failed to apply migration: {e}")
        return False


def downgrade():
    """Drop the relevance_keywords table and its index."""
    db_path = settings.DB_PATH

    if not db_path.exists():
        log.error(f"Database not found at {db_path}")
        return False

    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()

        cur.execute("DROP INDEX IF EXISTS idx_relevance_keywords_keyword")
        log.info("Dropped index: idx_relevance_keywords_keyword")

        cur.execute("DROP TABLE IF EXISTS relevance_keywords")
        log.info("Dropped table: relevance_keywords")

        conn.commit()
        conn.close()

        log.info("Migration downgrade complete: relevance_keywords table removed")
        return True

    except Exception as e:
        log.error(f"Failed to revert migration: {e}")
        return False


if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.INFO)

    action = sys.argv[1] if len(sys.argv) > 1 else "upgrade"

    if action == "downgrade":
        success = downgrade()
        print("✅ Downgrade complete" if success else "❌ Downgrade failed")
    else:
        success = upgrade()
        print("✅ Upgrade complete" if success else "❌ Upgrade failed")
