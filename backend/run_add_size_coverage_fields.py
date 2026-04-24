"""Run add_size_coverage_fields.sql for sizes coverage columns."""
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

ROOT_DIR = Path(__file__).resolve().parent
load_dotenv(ROOT_DIR / ".env")

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not set", file=sys.stderr)
    sys.exit(1)


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


def main() -> None:
    path = ROOT_DIR / "add_size_coverage_fields.sql"
    if not path.exists():
        print("add_size_coverage_fields.sql not found", file=sys.stderr)
        sys.exit(1)

    print("Running add_size_coverage_fields.sql...")
    engine = create_engine(DATABASE_URL)
    content = path.read_text(encoding="utf-8", errors="ignore")
    with engine.connect() as conn:
        for stmt in (s.strip() for s in content.split(";") if s.strip()):
            stmt = _strip_leading_comments(stmt)
            if not stmt:
                continue
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception as exc:
                print(f"Warning: {exc}", file=sys.stderr)
    print("Done.")


if __name__ == "__main__":
    main()
