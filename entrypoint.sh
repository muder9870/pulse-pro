#!/bin/bash
set -e

echo "=== AI Pulse Pro — Starting ==="

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    echo "Running database migrations..."

    # init.sql creates tables on first boot but does not create alembic_version.
    # Stamp the baseline revision once so `upgrade head` only applies migrations
    # after that point. Never use `stamp head`: new migrations would be skipped.
    python - <<'PY'
import os, subprocess, sys
from sqlalchemy import create_engine, text

def needs_baseline_stamp():
    url = os.environ.get("DATABASE_URL")
    if not url:
        return False
    eng = create_engine(url)
    with eng.connect() as conn:
        reg = conn.execute(
            text("SELECT to_regclass('public.alembic_version')")
        ).scalar()
        if reg is None:
            return True
        n = conn.execute(text("SELECT COUNT(*) FROM alembic_version")).scalar()
        return n == 0

if needs_baseline_stamp():
    print("Bootstrapping Alembic: stamping a1b2c3d4e5f6 (init.sql baseline)")
    subprocess.check_call(
        [sys.executable, "-m", "alembic", "stamp", "a1b2c3d4e5f6"],
        cwd="/app",
    )
PY
    python -m alembic upgrade head

    echo "Migrations complete."
else
    echo "Skipping migrations (RUN_MIGRATIONS=false)."
fi

echo "Starting: $@"
exec "$@"
