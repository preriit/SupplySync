# Phase 1 Migration Runbook (Urgent Track)

This runbook covers the first migration phase from the legacy production schema
(`legacy_inspect` style Django tables) into the new SupplySync schema.

## Goal

- Freeze target schema for relaunch.
- Run deterministic migration into a test DB.
- Validate counts and key entities before Phase 2.

## Scope

The script migrates:

- Reference tables: body/make/surface/application/quality types.
- Categories/sub-categories (legacy category dimensions -> new sub-categories).
- Merchants and users.
- Products and images.
- Product quantity logs -> `product_transactions`.

## Prerequisites

1. Legacy dump restored into local inspection DB (example: `legacy_inspect`).
2. Fresh target test DB created from current new schema (example: `supplysync_migration_test`).
3. Python venv with backend dependencies installed (`psycopg2-binary` included).

## 1) Create fresh target test DB

```powershell
psql -U postgres -c "DROP DATABASE IF EXISTS supplysync_migration_test;"
psql -U postgres -c "CREATE DATABASE supplysync_migration_test;"
psql -U postgres -d supplysync_migration_test -f backend\init_db.sql
psql -U postgres -d supplysync_migration_test -f backend\schema_v2.sql
psql -U postgres -d supplysync_migration_test -f backend\add_sizes_table.sql
psql -U postgres -d supplysync_migration_test -f backend\add_transactions_table.sql
psql -U postgres -d supplysync_migration_test -f backend\add_activity_log_table.sql
```

## 2) Dry-run migration (no writes)

```powershell
cd backend
.\.venv\Scripts\python.exe scripts\migrate_legacy_phase1.py --source-db-url "postgresql://postgres:YOUR_PASSWORD@localhost:5432/legacy_inspect" --target-db-url "postgresql://postgres:YOUR_PASSWORD@localhost:5432/supplysync_migration_test"
```

No `--apply` means dry-run mode.

## 3) Apply migration to test DB

```powershell
cd backend
.\.venv\Scripts\python.exe scripts\migrate_legacy_phase1.py --source-db-url "postgresql://postgres:YOUR_PASSWORD@localhost:5432/legacy_inspect" --target-db-url "postgresql://postgres:YOUR_PASSWORD@localhost:5432/supplysync_migration_test" --apply
```

## 4) Validation queries

```powershell
psql -U postgres -d supplysync_migration_test -c "SELECT COUNT(*) AS merchants FROM merchants;"
psql -U postgres -d supplysync_migration_test -c "SELECT COUNT(*) AS users FROM users;"
psql -U postgres -d supplysync_migration_test -c "SELECT COUNT(*) AS products FROM products;"
psql -U postgres -d supplysync_migration_test -c "SELECT COUNT(*) AS images FROM product_images;"
psql -U postgres -d supplysync_migration_test -c "SELECT COUNT(*) AS transactions FROM product_transactions;"
```

## 5) Go/No-Go for Phase 2

Proceed only if:

- Script completes in `--apply` mode without DB errors.
- Counts are within expected tolerance vs legacy.
- Spot checks (merchant, user, product) look correct in UI/API.

## Notes and limitations

- Legacy password hashes are copied as-is. Authentication compatibility with new
  auth flow may require password reset for migrated users.
- Transaction `quantity_before/after` values are reconstructed as running totals
  from ordered legacy logs.
- Migration is deterministic: UUIDs are derived from legacy ids for rerun safety.
