#!/usr/bin/env bash
# Import admin-level data into local SupplySync PostgreSQL.
#
# Prerequisites:
#   - Local DB already has schema (run init_db.sql, schema_v2.sql, migrations).
#   - You have the .sql file from export_admin_data.sh (on EC2).
#
# Usage:
#   export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGPASSWORD=xxx PGDATABASE=supplysync
#   ./scripts/import_admin_data.sh supplysync_admin_data_YYYYMMDD_HHMMSS.sql
#
# Or with connection URL:
#   ./scripts/import_admin_data.sh supplysync_admin_data_YYYYMMDD_HHMMSS.sql "postgresql://postgres:postgres@localhost:5432/supplysync"

set -e

if [ -z "$1" ] || [ ! -f "$1" ]; then
  echo "Usage: $0 <path-to-exported.sql> [connection_url]"
  echo "Example: $0 supplysync_admin_data_20260314_120000.sql"
  exit 1
fi

SQL_FILE="$1"
CONNECTION_URL="${2:-}"

# Truncate reference tables in safe order (respecting FKs).
# Users table: we do NOT truncate by default so local admin user is not wiped.
# To replace all users (including local admin), run with TRUNCATE_USERS=1.
TRUNCATE_USERS="${TRUNCATE_USERS:-0}"

run_psql() {
  if [ -n "$CONNECTION_URL" ]; then
    psql "$CONNECTION_URL" "$@"
  else
    psql "$@"
  fi
}

echo "Truncating reference tables (preserving schema)..."
run_psql -v ON_ERROR_STOP=1 <<'SQL'
TRUNCATE TABLE sizes CASCADE;
TRUNCATE TABLE make_types CASCADE;
TRUNCATE TABLE body_types CASCADE;
TRUNCATE TABLE application_types CASCADE;
TRUNCATE TABLE surface_types CASCADE;
TRUNCATE TABLE qualities CASCADE;
SQL

if [ "$TRUNCATE_USERS" = "1" ]; then
  echo "Truncating users table..."
  run_psql -v ON_ERROR_STOP=1 -c "TRUNCATE TABLE users CASCADE;"
fi

echo "Loading data from $SQL_FILE..."
if [ -n "$CONNECTION_URL" ]; then
  psql "$CONNECTION_URL" -v ON_ERROR_STOP=1 -f "$SQL_FILE"
else
  psql -v ON_ERROR_STOP=1 -f "$SQL_FILE"
fi

echo "Import complete. Reference data and users (if included) are loaded."
echo "If you did not truncate users, duplicate key errors for existing local users are expected and can be ignored."
