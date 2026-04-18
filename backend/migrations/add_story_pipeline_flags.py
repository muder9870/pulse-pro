"""
Add pipeline workflow columns to processed_articles for StoryCard state machine.

Columns:
  - story_review_status (none | pending | approved)
  - content_approved
  - pipeline_needs_review
  - ready_to_schedule
"""

import logging
from sqlalchemy import inspect, text

from backend.db.session import engine

log = logging.getLogger("migrations")


def _add_column_sqlite(conn, table: str, name: str, ddl: str) -> None:
    insp = inspect(engine)
    if table not in insp.get_table_names():
        log.warning("Table %s not found; skip pipeline flag migration", table)
        return
    cols = {c["name"] for c in insp.get_columns(table)}
    if name in cols:
        log.info("Column %s.%s already exists", table, name)
        return
    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {ddl}"))
    log.info("Added column %s to %s", name, table)


def _add_column_pg(conn, table: str, name: str, ddl_pg: str) -> None:
    insp = inspect(engine)
    if table not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns(table)}
    if name in cols:
        log.info("Column %s.%s already exists", table, name)
        return
    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {ddl_pg}"))
    log.info("Added column %s to %s", name, table)


def upgrade() -> bool:
    dialect = engine.dialect.name
    table = "processed_articles"
    try:
        with engine.begin() as conn:
            if dialect == "sqlite":
                _add_column_sqlite(conn, table, "story_review_status", "story_review_status VARCHAR(32) DEFAULT 'none'")
                # SQLite stores booleans as INTEGER 0/1
                _add_column_sqlite(conn, table, "content_approved", "content_approved INTEGER DEFAULT 0")
                _add_column_sqlite(conn, table, "pipeline_needs_review", "pipeline_needs_review INTEGER DEFAULT 0")
                _add_column_sqlite(conn, table, "ready_to_schedule", "ready_to_schedule INTEGER DEFAULT 0")
            else:
                # PostgreSQL and others
                _add_column_pg(conn, table, "story_review_status", "story_review_status VARCHAR(32) DEFAULT 'none'")
                _add_column_pg(conn, table, "content_approved", "content_approved BOOLEAN DEFAULT FALSE")
                _add_column_pg(conn, table, "pipeline_needs_review", "pipeline_needs_review BOOLEAN DEFAULT FALSE")
                _add_column_pg(conn, table, "ready_to_schedule", "ready_to_schedule BOOLEAN DEFAULT FALSE")
        return True
    except Exception as e:
        log.exception("add_story_pipeline_flags failed: %s", e)
        return False


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    upgrade()
