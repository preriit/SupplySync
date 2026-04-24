"""Sync subcategories/sizes/products from an Excel dataset.

Usage:
  python sync_subcategories_from_excel.py --xlsx "C:\\path\\subcategories_dataset.xlsx" --dry-run
  python sync_subcategories_from_excel.py --xlsx "C:\\path\\subcategories_dataset.xlsx" --apply
"""
from __future__ import annotations

import argparse
import os
import sys
import uuid
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from database import SessionLocal
from models import (
    ApplicationType,
    BodyType,
    MakeType,
    Product,
    Size,
    SubCategory,
)


REQUIRED_COLUMNS = {
    "id",
    "category_id",
    "name",
    "size",
    "height_inches",
    "width_inches",
    "height_mm",
    "width_mm",
    "make_type_id",
    "default_packing_per_box",
    "is_active",
}


def coverage_per_pc_from_mm(width_mm: int, height_mm: int) -> tuple[float, float]:
    sqm = (float(width_mm) * float(height_mm)) / 1_000_000.0
    sqft = sqm * 10.764
    return sqm, sqft


def parse_uuid(value: Any, label: str) -> uuid.UUID:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        raise ValueError(f"{label} is empty")
    return uuid.UUID(str(value).strip())


def normalize_size_token(size_text: str) -> str:
    return str(size_text or "").replace('"', "").replace(" ", "").lower()


def bool_from_cell(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    text = str(value).strip().lower()
    return text in {"true", "1", "yes", "y"}


def dominant_body_app_for_subcategory(db: Session, subcat_id: uuid.UUID) -> tuple[uuid.UUID | None, uuid.UUID | None]:
    products = db.query(Product).filter(Product.sub_category_id == subcat_id).all()
    if not products:
        return None, None

    body_counts = Counter([p.body_type_id for p in products if p.body_type_id])
    app_counts = Counter([p.application_type_id for p in products if p.application_type_id])
    body_id = body_counts.most_common(1)[0][0] if body_counts else None
    app_id = app_counts.most_common(1)[0][0] if app_counts else None
    return body_id, app_id


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync subcategories from Excel")
    parser.add_argument("--xlsx", required=True, help="Absolute path to XLSX file")
    parser.add_argument("--sheet", default=None, help="Sheet name (defaults to first sheet)")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    root_dir = Path(__file__).resolve().parent
    load_dotenv(root_dir / ".env")
    if not os.environ.get("DATABASE_URL"):
        print("DATABASE_URL not set in backend/.env", file=sys.stderr)
        sys.exit(1)

    xlsx_path = Path(args.xlsx)
    if not xlsx_path.exists():
        print(f"XLSX not found: {xlsx_path}", file=sys.stderr)
        sys.exit(1)

    xls = pd.ExcelFile(xlsx_path)
    sheet_name = args.sheet or xls.sheet_names[0]
    df = pd.read_excel(xlsx_path, sheet_name=sheet_name)
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        print(f"Missing required columns: {sorted(missing)}", file=sys.stderr)
        sys.exit(1)

    dry_run = not args.apply
    print(f"Mode: {'DRY RUN' if dry_run else 'APPLY'}")
    print(f"Rows in sheet '{sheet_name}': {len(df)}")

    db = SessionLocal()
    try:
        # Validate refs and group rows by canonical size dimensions.
        grouped_rows: dict[tuple[int, int, int, int], list[dict[str, Any]]] = defaultdict(list)
        row_payloads: list[dict[str, Any]] = []
        for idx, row in df.iterrows():
            subcat_id = parse_uuid(row["id"], f"row {idx} id")
            category_id = parse_uuid(row["category_id"], f"row {idx} category_id")
            make_type_id = parse_uuid(row["make_type_id"], f"row {idx} make_type_id")
            height_inches = int(row["height_inches"])
            width_inches = int(row["width_inches"])
            height_mm = int(row["height_mm"])
            width_mm = int(row["width_mm"])
            default_pack = int(row["default_packing_per_box"])
            is_active = bool_from_cell(row["is_active"])

            if default_pack <= 0:
                raise ValueError(f"row {idx}: default_packing_per_box must be > 0")
            if min(height_inches, width_inches, height_mm, width_mm) <= 0:
                raise ValueError(f"row {idx}: dimensions must be > 0")

            make_exists = db.query(MakeType).filter(MakeType.id == make_type_id).first()
            if not make_exists:
                raise ValueError(f"row {idx}: make_type_id not found: {make_type_id}")

            subcat = db.query(SubCategory).filter(SubCategory.id == subcat_id).first()
            if not subcat:
                raise ValueError(f"row {idx}: subcategory id not found: {subcat_id}")

            payload = {
                "subcat_id": subcat_id,
                "category_id": category_id,
                "name": str(row["name"]).strip(),
                "size": str(row["size"]).strip(),
                "height_inches": height_inches,
                "width_inches": width_inches,
                "height_mm": height_mm,
                "width_mm": width_mm,
                "make_type_id": make_type_id,
                "default_pack": default_pack,
                "is_active": is_active,
            }
            row_payloads.append(payload)
            grouped_rows[(height_inches, width_inches, height_mm, width_mm)].append(payload)

        print(f"Distinct canonical sizes from file: {len(grouped_rows)}")

        # Upsert size refs.
        size_by_key: dict[tuple[int, int, int, int], Size] = {}
        for key, rows in grouped_rows.items():
            h_in, w_in, h_mm, w_mm = key
            name = f"{h_in} x {w_in}"
            name_mm = f"{h_mm} x {w_mm}"
            cov_sqm, cov_sqft = coverage_per_pc_from_mm(w_mm, h_mm)
            pack_mode = Counter([r["default_pack"] for r in rows]).most_common(1)[0][0]

            # Dominant body/app from linked products in this group.
            body_counter: Counter[uuid.UUID] = Counter()
            app_counter: Counter[uuid.UUID] = Counter()
            for r in rows:
                body_id, app_id = dominant_body_app_for_subcategory(db, r["subcat_id"])
                if body_id:
                    body_counter[body_id] += 1
                if app_id:
                    app_counter[app_id] += 1
            body_id = body_counter.most_common(1)[0][0] if body_counter else None
            app_id = app_counter.most_common(1)[0][0] if app_counter else None

            size = db.query(Size).filter(Size.name == name).first()
            if not size:
                size = db.query(Size).filter(
                    Size.height_inches == h_in,
                    Size.width_inches == w_in,
                    Size.height_mm == h_mm,
                    Size.width_mm == w_mm,
                ).first()

            if size:
                size.name = name
                size.name_mm = name_mm
                size.height_inches = h_in
                size.width_inches = w_in
                size.height_mm = h_mm
                size.width_mm = w_mm
                size.default_packaging_per_box = pack_mode
                size.coverage_per_pc_sqm = cov_sqm
                size.coverage_per_pc_sqft = cov_sqft
                if body_id:
                    # validate in case stale FK
                    if db.query(BodyType).filter(BodyType.id == body_id).first():
                        size.body_type_id = body_id
                if app_id:
                    if db.query(ApplicationType).filter(ApplicationType.id == app_id).first():
                        size.application_type_id = app_id
                size.is_active = True
                action = "update"
            else:
                size = Size(
                    name=name,
                    name_mm=name_mm,
                    height_inches=h_in,
                    width_inches=w_in,
                    height_mm=h_mm,
                    width_mm=w_mm,
                    default_packaging_per_box=pack_mode,
                    coverage_per_pc_sqm=cov_sqm,
                    coverage_per_pc_sqft=cov_sqft,
                    application_type_id=app_id,
                    body_type_id=body_id,
                    is_active=True,
                )
                db.add(size)
                action = "create"

            if not dry_run:
                db.flush()
            size_by_key[key] = size
            print(f"size:{action} key={key} name='{name}' pack={pack_mode}")

        # Update subcategories + propagate products.
        updated_subcats = 0
        updated_products = 0
        for row in row_payloads:
            key = (row["height_inches"], row["width_inches"], row["height_mm"], row["width_mm"])
            size_ref = size_by_key[key]
            cov_sqm, cov_sqft = coverage_per_pc_from_mm(row["width_mm"], row["height_mm"])

            subcat = db.query(SubCategory).filter(SubCategory.id == row["subcat_id"]).first()
            subcat.category_id = row["category_id"]
            subcat.name = row["name"]
            subcat.size = row["size"]
            subcat.height_inches = row["height_inches"]
            subcat.width_inches = row["width_inches"]
            subcat.height_mm = row["height_mm"]
            subcat.width_mm = row["width_mm"]
            subcat.make_type_id = row["make_type_id"]
            subcat.default_packing_per_box = row["default_pack"]
            subcat.is_active = row["is_active"]
            subcat.size_id = size_ref.id if size_ref.id else subcat.size_id
            subcat.coverage_per_pc_sqm = cov_sqm
            subcat.coverage_per_pc_sqft = cov_sqft
            updated_subcats += 1

            products = db.query(Product).filter(Product.sub_category_id == subcat.id).all()
            for product in products:
                product.coverage_per_pc_sqm = cov_sqm
                product.coverage_per_pc_sqft = cov_sqft
                product.coverage_per_box_sqm = cov_sqm * float(product.packing_per_box)
                product.coverage_per_box_sqft = cov_sqft * float(product.packing_per_box)
                updated_products += 1

        if dry_run:
            db.rollback()
            print("Dry-run complete. No changes persisted.")
        else:
            db.commit()
            print("Apply complete. Changes committed.")

        print(f"Subcategories processed: {updated_subcats}")
        print(f"Products coverage propagated: {updated_products}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
