#!/usr/bin/env bash
# Export admin-level data from SupplySync PostgreSQL (e.g. on EC2).
# Output: supplysync_admin_data_YYYYMMDD.sql
#
# Exports:
#   - Reference tables: body_types, application_types, surface_types,
#     qualities, make_types, sizes
#   - Admin-managed: users (all; includes admin accounts)
#
# Usage:
#   On EC2 (or wherever DB runs):
#     export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGPASSWORD=xxx PGDATABASE=supplysync
#     ./scripts/export_admin_data.sh
#   Or:
#     ./scripts/export_admin_data.sh "postgresql://user:pass@ec2-host:5432/supplysync"
#
# Transfer the generated .sql file to your local machine (scp, S3, etc.).

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
OUTPUT_NAME="supplysync_admin_data_$(date +%Y%m%d_%H%M%S).sql"
OUTPUT_PATH="${OUTPUT_PATH:-$PROJECT_ROOT/$OUTPUT_NAME}"

# Tables in dependency order (reference data first; users last)
TABLES="body_types application_types surface_types qualities make_types sizes users"

T_ARGS=""
for t in $TABLES; do T_ARGS="$T_ARGS -t $t"; done

# Connection: use first arg as full URL, or use PG* env vars
if [ -n "$1" ]; then
  pg_dump "$1" \
    --data-only \
    --no-owner \
    --no-privileges \
    $T_ARGS \
    --file="$OUTPUT_PATH"
else
  pg_dump \
    --data-only \
    --no-owner \
    --no-privileges \
    $T_ARGS \
    --file="$OUTPUT_PATH"
fi

echo "Exported admin data to: $OUTPUT_PATH"
echo "Transfer this file to your local machine, then run scripts/import_admin_data.sh"
