#!/usr/bin/env python3
"""
Apply idempotency index migration outside of transaction
"""

import os
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent / "backend"))

from backend.db.session import engine
from sqlalchemy import text

def apply_migration():
    """Apply the idempotency index migration."""
    
    migration_sql = """
    -- Migration: Add index for idempotency performance
    -- Created: 2026-03-29
    -- Purpose: Improve query performance for idempotency checks

    CREATE INDEX CONCURRENTLY idx_idempotency_created_at 
    ON idempotency_logs(created_at);

    -- Add comment for documentation
    COMMENT ON INDEX idx_idempotency_created_at IS 'Index for idempotency log queries by creation time';
    """
    
    print("🔧 Applying idempotency index migration...")
    
    # Check if index exists
    with engine.connect() as conn:
        result = conn.execute(text("SELECT indexname FROM pg_indexes WHERE indexname = 'idx_idempotency_created_at'"))
        index_exists = result.fetchone()
        if index_exists:
            print('✅ Index idx_idempotency_created_at already exists')
        else:
            print('❌ Index not found')
    
    # Use autocommit mode to run outside transaction
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        try:
            conn.execute(text(migration_sql))
            print("✅ Migration completed successfully!")
            print("📈 Index idx_idempotency_created_at created")
            return True
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            return False

if __name__ == "__main__":
    apply_migration()
