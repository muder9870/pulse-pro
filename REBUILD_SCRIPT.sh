#!/bin/bash
# PostgreSQL Clean Rebuild Script
# AI Pulse Pro - Database Migration
# Date: February 24, 2026

set -e  # Exit on error

echo "========================================="
echo "PostgreSQL Clean Rebuild Script"
echo "========================================="
echo ""
echo "WARNING: This will WIPE ALL DATA"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

# Configuration
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-ai_pulse_pro}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

echo ""
echo "Step 1: Backup existing migrations..."
if [ -d "migrations/versions" ]; then
    cp -r migrations/versions migrations/versions.backup.$(date +%Y%m%d_%H%M%S)
    echo "✓ Backup created"
else
    echo "⚠ No migrations directory found"
fi

echo ""
echo "Step 2: Delete old migration files..."
find migrations/versions -name "*.py" ! -name "__init__.py" -delete
echo "✓ Old migrations deleted"

echo ""
echo "Step 3: Drop and recreate database schema..."
PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" <<EOF
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO ${DB_USER};
GRANT ALL ON SCHEMA public TO public;
EOF
echo "✓ Schema recreated"

echo ""
echo "Step 4: Generate new baseline migration..."
alembic revision --autogenerate -m "baseline_complete_schema"
echo "✓ Migration generated"

echo ""
echo "Step 5: Apply migration..."
alembic upgrade head
echo "✓ Migration applied"

echo ""
echo "Step 6: Verify tables..."
PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "\dt"

echo ""
echo "========================================="
echo "Rebuild Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Review generated migration in migrations/versions/"
echo "2. Run tests: pytest"
echo "3. Start application and verify functionality"
echo "4. Begin Phase 5: Remove SQLite code"
echo ""
