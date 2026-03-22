"""
Export reference data and admin users from a source DB (e.g. EC2/RDS)
and write a SQL file you can run against your local DB.

Usage:
  Set SOURCE_DATABASE_URL (or pass as first arg), then run from backend/:
    python scripts/sync_reference_data_from_ec2.py [SOURCE_DATABASE_URL] [--output FILE]

  Then on your machine, apply the generated SQL to local:
    psql -U postgres -d supplysync -f ec2_reference_and_admin_data.sql

Requires: pip install psycopg2-binary (or use existing backend venv)
"""

import os
import sys
import argparse
from datetime import date, datetime
from uuid import UUID

# Add backend to path when run as script
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("Install psycopg2: pip install psycopg2-binary")
    sys.exit(1)

# Reference tables in insert order (dependencies first)
REFERENCE_TABLES = [
    "body_types",
    "make_types",
    "surface_types",
    "application_types",
    "qualities",
    "categories",
    "sizes",
    "sub_categories",
]

# Columns to skip for users (e.g. if you want to avoid overwriting something)
USER_COLUMNS = [
    "id", "username", "email", "phone", "password_hash", "user_type", "merchant_id",
    "role", "business_name", "business_address", "gst_number", "preferred_language",
    "is_verified", "is_active", "created_at", "last_login", "deleted_at", "metadata",
]


def escape_sql(val):
    if val is None:
        return "NULL"
    if isinstance(val, bool):
        return "TRUE" if val else "FALSE"
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, (datetime, date)):
        return "'" + val.isoformat().replace("T", " ").split(".")[0] + "'"
    if isinstance(val, UUID):
        return "'" + str(val) + "'"
    if isinstance(val, dict):
        import json
        return "'" + json.dumps(val).replace("'", "''") + "'"
    return "'" + str(val).replace("'", "''") + "'"


def fetch_table(conn, table):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(f'SELECT * FROM "{table}"')
        return cur.fetchall()


def fetch_admin_users(conn):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT * FROM users WHERE user_type = 'admin'")
        return cur.fetchall()


def row_to_values(row, columns):
    return ", ".join(escape_sql(row.get(c)) for c in columns)


def build_insert_on_conflict(table, columns, rows, conflict_key="id"):
    if not rows:
        return ""
    col_list = ", ".join(f'"{c}"' for c in columns)
    updates = ", ".join(f'"{c}" = EXCLUDED."{c}"' for c in columns if c != conflict_key)
    lines = []
    for row in rows:
        vals = row_to_values(row, columns)
        lines.append(f"  ({vals})")
    values_sql = ",\n".join(lines)
    return f"""
INSERT INTO "{table}" ({col_list})
VALUES
{values_sql}
ON CONFLICT ("{conflict_key}") DO UPDATE SET {updates};
"""


def main():
    parser = argparse.ArgumentParser(description="Export EC2 reference data and admin users to a SQL file")
    parser.add_argument("source_url", nargs="?", default=os.environ.get("SOURCE_DATABASE_URL"),
                        help="Source DB URL (e.g. postgresql://user:pass@ec2-or-rds-host:5432/supplysync)")
    parser.add_argument("--output", "-o", default="ec2_reference_and_admin_data.sql",
                        help="Output SQL file path")
    args = parser.parse_args()

    if not args.source_url:
        print("Provide SOURCE_DATABASE_URL env or pass source_url as first argument.")
        sys.exit(1)

    out_path = args.output
    if not os.path.isabs(out_path):
        out_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), out_path)

    print(f"Connecting to source DB...")
    conn = psycopg2.connect(args.source_url)

    sql_parts = [
        "-- SupplySync: Reference data + admin users from EC2",
        "-- Run against local: psql -U postgres -d supplysync -f ec2_reference_and_admin_data.sql",
        "",
    ]

    # 1) Reference tables
    for table in REFERENCE_TABLES:
        rows = fetch_table(conn, table)
        print(f"  {table}: {len(rows)} rows")
        if not rows:
            continue
        columns = list(rows[0].keys())
        sql_parts.append(build_insert_on_conflict(table, columns, rows, conflict_key="id"))

    # 2) Admin users (ON CONFLICT on email so we can re-run and update)
    admin_rows = fetch_admin_users(conn)
    print(f"  users (admin): {len(admin_rows)} rows")
    if admin_rows:
        columns = [c for c in USER_COLUMNS if c in admin_rows[0]]
        col_list = ", ".join(f'"{c}"' for c in columns)
        updates = ", ".join(f'"{c}" = EXCLUDED."{c}"' for c in columns if c != "email")
        lines = []
        for row in admin_rows:
            vals = row_to_values(row, columns)
            lines.append(f"  ({vals})")
        values_sql = ",\n".join(lines)
        sql_parts.append(f"""
INSERT INTO users ({col_list})
VALUES
{values_sql}
ON CONFLICT (email) DO UPDATE SET {updates};
""")

    conn.close()

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_parts))

    print(f"Wrote {out_path}")
    print("Apply to local DB: psql -U postgres -d supplysync -f", os.path.basename(out_path))


if __name__ == "__main__":
    main()
