"""
Apply SupplySync SQL patches in order (idempotent where possible).

Fixes errors like:
  UndefinedColumn: column sub_categories.application_type_id does not exist

From the backend folder, with DATABASE_URL in .env:
    python run_supplysync_migrations.py

Order:
  1. add_subcategory_size_id.sql
  2. add_subcategory_application_body.sql  (application_type_id, body_type_id, …)
  3. add_coverage_fields.sql
  4. add_size_coverage_fields.sql
  5. add_snapshot_label_columns.sql  (product/subcategory snapshot labels)
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

ROOT_DIR = Path(__file__).resolve().parent
load_dotenv(ROOT_DIR / ".env")

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not set in backend/.env", file=sys.stderr)
    sys.exit(1)

SCRIPT_DIR = Path(__file__).resolve().parent

MIGRATION_FILES = [
    "add_subcategory_size_id.sql",
    "add_subcategory_application_body.sql",
    "add_coverage_fields.sql",
    "add_size_coverage_fields.sql",
    "add_snapshot_label_columns.sql",
]


def _strip_leading_comments(stmt: str) -> str:
    lines = stmt.splitlines()
    start = 0
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("--"):
            start += 1
        else:
            break
    return "\n".join(lines[start:]).strip()


def _benign_sql_error(msg: str) -> bool:
    """Only ignore true idempotency noise; real failures should fail the run."""
    m = msg.lower()
    if "already exists" in m:
        return True
    if "duplicate" in m and ("index" in m or "relation" in m or "constraint" in m):
        return True
    return False


def run_file(engine, path: Path) -> bool:
    """Return False if a non-benign error occurred."""
    print(f"\n>>> {path.name}")
    content = path.read_text(encoding="utf-8", errors="ignore")
    ok = True
    with engine.connect() as conn:
        for raw in content.split(";"):
            stmt = _strip_leading_comments(raw.strip())
            if not stmt:
                continue
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception as e:
                conn.rollback()
                err = str(e)
                if _benign_sql_error(err):
                    print(f"    (skip) {err[:200]}")
                else:
                    print(f"    ERROR: {err}", file=sys.stderr)
                    ok = False
    return ok


def main() -> None:
    engine = create_engine(DATABASE_URL)
    failed = False
    for name in MIGRATION_FILES:
        path = SCRIPT_DIR / name
        if not path.exists():
            print(f"Missing file: {path}", file=sys.stderr)
            failed = True
            continue
        if not run_file(engine, path):
            failed = True

    if failed:
        print("\nOne or more statements failed. Fix errors above, then re-run.", file=sys.stderr)
        sys.exit(1)
    print("\nAll migration files processed. Restart the API and retry Inventory.")


if __name__ == "__main__":
    main()
