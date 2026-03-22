"""Run SQL schema files in order. Used by Docker entrypoint. Uses DATABASE_URL from env."""
import os
import sys
from pathlib import Path
from sqlalchemy import create_engine, text

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not set", file=sys.stderr)
    sys.exit(1)

# SQL files in order (relative to this script's directory)
SCRIPT_DIR = Path(__file__).resolve().parent
SQL_FILES = [
    "init_db.sql",
    "schema_v2.sql",
    "seed_data.sql",
    "add_sizes_table.sql",
    "add_size_fields.sql",
    "add_transactions_table.sql",
    "add_product_images_table.sql",
    "add_activity_log_table.sql",
    "add_subscription_admin_fields.sql",
]


def _strip_leading_comments(stmt: str) -> str:
    """Remove leading blank lines and comment-only lines so we don't skip real SQL."""
    lines = stmt.splitlines()
    start = 0
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("--"):
            start += 1
        else:
            break
    return "\n".join(lines[start:]).strip()


def run_sql_file(engine, path: Path) -> None:
    content = path.read_text(encoding="utf-8", errors="ignore")
    with engine.connect() as conn:
        for stmt in (s.strip() for s in content.split(";") if s.strip()):
            stmt = _strip_leading_comments(stmt)
            if not stmt:
                continue
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                    pass
                else:
                    print(f"Warning: {path.name}: {e}", file=sys.stderr)


def main():
    engine = create_engine(DATABASE_URL)
    for name in SQL_FILES:
        path = SCRIPT_DIR / name
        if not path.exists():
            print(f"Skip (not found): {name}")
            continue
        print(f"Running {name}...")
        run_sql_file(engine, path)
    print("Schema run complete.")


if __name__ == "__main__":
    main()
