"""Drop all tables in the database and re-run schema from scratch. No migrated/imported data."""
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
    "init_db.sql",
    "schema_v2.sql",
    "add_categories_slug.sql",  # add slug/description/display_order/is_active if categories from init_db
    "seed_data.sql",
    "add_sizes_table.sql",
    "add_size_fields.sql",  # name_mm, default_packaging_per_box, application_type_id, body_type_id
    "add_subcategory_size_id.sql",  # sub_categories.size_id -> sizes
    "add_subcategory_application_body.sql",  # application_type_id, body_type_id; make_type_id nullable
    "add_coverage_fields.sql",  # subcategory + product coverage (sq m / sq ft)
    "add_size_coverage_fields.sql",  # sizes coverage (sq m / sq ft)
    "add_snapshot_label_columns.sql",  # denormalized labels on products + sub_categories
    "add_transactions_table.sql",
    "add_product_images_table.sql",
    "add_activity_log_table.sql",
    "add_subscription_admin_fields.sql",
]


def drop_all_tables(engine):
    """Drop every table in the public schema (CASCADE)."""
    with engine.connect() as conn:
        conn.execute(text("""
            DO $$
            DECLARE r RECORD;
            BEGIN
              FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
              LOOP
                EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
              END LOOP;
            END $$;
        """))
        conn.commit()
    print("Dropped all tables in public schema.")


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
    print("Resetting database: drop all tables, then re-run schema...")
    engine = create_engine(DATABASE_URL)
    drop_all_tables(engine)
    print("Re-running schema and seed...")
    for name in SQL_FILES:
        path = SCRIPT_DIR / name
        if not path.exists():
            print(f"Skip (not found): {name}")
            continue
        print(f"Running {name}...")
        run_sql_file(engine, path)
    print("Done. Database is fresh. Admin login: username admin, password password.")


if __name__ == "__main__":
    main()
