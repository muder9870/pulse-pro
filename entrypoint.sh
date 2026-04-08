#!/bin/bash
set -e

echo "=== AI Pulse Pro — Starting ==="

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    echo "Running database migrations..."

    # Stamp at head first so Alembic knows the schema is fully up to date
    # (init.sql already created all tables and columns).
    # Then run upgrade head — it's a no-op if already at head,
    # and all migration files are now idempotent (column_exists guards).
    python -m alembic stamp head
    python -m alembic upgrade head

    echo "Migrations complete."
else
    echo "Skipping migrations (RUN_MIGRATIONS=false)."
fi

echo "Starting: $@"
exec "$@"
