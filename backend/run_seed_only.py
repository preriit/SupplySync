"""Run only seed_data.sql (and add_sizes_table.sql) to populate reference tables without wiping the DB."""
import os
import sys
from pathlib import Path
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent
load_dotenv(ROOT_DIR / ".env")

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not set in environment (backend/.env)", file=sys.stderr)
    sys.exit(1)

SCRIPT_DIR = Path(__file__).resolve().parent
SQL_FILES = [
    "seed_data.sql",
    "add_sizes_table.sql",
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
    print("Running seed data only (no table drop)...")
    engine = create_engine(DATABASE_URL)
    for name in SQL_FILES:
        path = SCRIPT_DIR / name
        if not path.exists():
            print(f"Skip (not found): {name}")
            continue
        print(f"Running {name}...")
        run_sql_file(engine, path)
    print("Done. Refresh Reference Data page to see counts.")


if __name__ == "__main__":
    main()
