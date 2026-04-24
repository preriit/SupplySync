"""Final product-system reconciliation matrix + safe auto-fixes.

Checks:
- Product IDs vs references (surface, quality, application, body)
- Product coverage per pc/box vs subcategory dimensions + packing
- Product derived make/size via subcategory link
- Subcategory size_id mapping consistency

Safe fixes:
- Map missing/invalid product *_id using product snapshot names (case-insensitive)
- Sync snapshot name columns from valid IDs
- Recompute coverage fields from subcategory dimensions + packing
- Map missing subcategory size_id by exact dimensions
"""

from __future__ import annotations

import csv
from pathlib import Path

from database import SessionLocal
from models import (
    ApplicationType,
    BodyType,
    MakeType,
    Product,
    Quality,
    Size,
    SubCategory,
    SurfaceType,
)


def cov_from_mm(width_mm: int, height_mm: int) -> tuple[float, float]:
    sqm = (float(width_mm) * float(height_mm)) / 1_000_000.0
    sqft = sqm * 10.764
    return sqm, sqft


def name_map(rows):
    return {str(r.name).strip().lower(): r for r in rows if getattr(r, "name", None)}


def close(a, b, eps=1e-6):
    if a is None or b is None:
        return False
    return abs(float(a) - float(b)) <= eps


def main() -> None:
    reports_dir = Path("reports")
    reports_dir.mkdir(exist_ok=True)
    out_csv = reports_dir / "clean_vs_needs_fix.csv"

    db = SessionLocal()
    try:
        surfaces = db.query(SurfaceType).all()
        qualities = db.query(Quality).all()
        apps = db.query(ApplicationType).all()
        bodies = db.query(BodyType).all()
        make_types = db.query(MakeType).all()
        sizes = db.query(Size).all()
        subcats = db.query(SubCategory).all()
        products = db.query(Product).all()

        surface_by_id = {s.id: s for s in surfaces}
        quality_by_id = {q.id: q for q in qualities}
        app_by_id = {a.id: a for a in apps}
        body_by_id = {b.id: b for b in bodies}
        make_by_id = {m.id: m for m in make_types}
        size_by_id = {s.id: s for s in sizes}
        subcat_by_id = {s.id: s for s in subcats}

        surface_by_name = name_map(surfaces)
        quality_by_name = name_map(qualities)
        app_by_name = name_map(apps)
        body_by_name = name_map(bodies)

        size_by_dims = {
            (s.height_inches, s.width_inches, s.height_mm, s.width_mm): s for s in sizes
        }

        fixes = {
            "product_id_remaps": 0,
            "product_name_sync": 0,
            "product_coverage_sync": 0,
            "subcategory_size_id_sync": 0,
        }
        rows = []

        # Subcategory-level checks/fixes.
        for sc in subcats:
            if not sc.is_active:
                continue
            status = "clean"
            issues = []
            fixes_applied = []

            if sc.make_type_id and sc.make_type_id not in make_by_id:
                status = "needs-fix"
                issues.append("invalid_make_type_id")

            key = (sc.height_inches, sc.width_inches, sc.height_mm, sc.width_mm)
            sz = size_by_id.get(sc.size_id) if sc.size_id else None
            if not sz and key in size_by_dims:
                sc.size_id = size_by_dims[key].id
                sz = size_by_dims[key]
                fixes["subcategory_size_id_sync"] += 1
                fixes_applied.append("mapped_size_id_by_dimensions")
                status = "fixed"
            elif not sz:
                status = "needs-fix"
                issues.append("missing_size_id_unmappable")
            elif (
                sz.height_inches != sc.height_inches
                or sz.width_inches != sc.width_inches
                or sz.height_mm != sc.height_mm
                or sz.width_mm != sc.width_mm
            ):
                status = "needs-fix"
                issues.append("size_id_dimension_mismatch")

            rows.append(
                {
                    "entity_type": "subcategory",
                    "entity_id": str(sc.id),
                    "name": sc.name,
                    "status": status,
                    "issues": "|".join(issues) if issues else "",
                    "fixes_applied": "|".join(fixes_applied) if fixes_applied else "",
                }
            )

        # Product-level checks/fixes.
        for p in products:
            if not p.is_active:
                continue
            status = "clean"
            issues = []
            fixes_applied = []
            sc = subcat_by_id.get(p.sub_category_id)
            if not sc:
                rows.append(
                    {
                        "entity_type": "product",
                        "entity_id": str(p.id),
                        "name": f"{p.brand} {p.name}",
                        "status": "needs-fix",
                        "issues": "missing_subcategory",
                        "fixes_applied": "",
                    }
                )
                continue

            # ID validation + mapping from product snapshot names.
            id_name_triplets = [
                ("surface_type_id", "surface_type_name", surface_by_id, surface_by_name),
                ("quality_id", "quality_name", quality_by_id, quality_by_name),
                ("application_type_id", "application_type_name", app_by_id, app_by_name),
                ("body_type_id", "body_type_name", body_by_id, body_by_name),
            ]

            for id_attr, name_attr, by_id, by_name in id_name_triplets:
                current_id = getattr(p, id_attr, None)
                valid = current_id in by_id if current_id is not None else False
                snap_name = getattr(p, name_attr, None) if hasattr(p, name_attr) else None

                if not valid:
                    mapped = by_name.get(str(snap_name).strip().lower()) if snap_name else None
                    if mapped:
                        setattr(p, id_attr, mapped.id)
                        fixes["product_id_remaps"] += 1
                        fixes_applied.append(f"mapped_{id_attr}_from_{name_attr}")
                        status = "fixed"
                    else:
                        status = "needs-fix"
                        issues.append(f"invalid_{id_attr}")

                # Sync snapshot name from resolved ID if column exists.
                resolved_id = getattr(p, id_attr, None)
                if hasattr(p, name_attr) and resolved_id in by_id:
                    canonical_name = by_id[resolved_id].name
                    if getattr(p, name_attr) != canonical_name:
                        setattr(p, name_attr, canonical_name)
                        fixes["product_name_sync"] += 1
                        fixes_applied.append(f"sync_{name_attr}")
                        if status == "clean":
                            status = "fixed"

            # Coverage checks/fix.
            exp_pc_sqm, exp_pc_sqft = cov_from_mm(sc.width_mm, sc.height_mm)
            exp_box_sqm = exp_pc_sqm * float(p.packing_per_box or 0)
            exp_box_sqft = exp_pc_sqft * float(p.packing_per_box or 0)

            mismatch = not (
                close(p.coverage_per_pc_sqm, exp_pc_sqm)
                and close(p.coverage_per_pc_sqft, exp_pc_sqft)
                and close(p.coverage_per_box_sqm, exp_box_sqm)
                and close(p.coverage_per_box_sqft, exp_box_sqft)
            )
            if mismatch:
                p.coverage_per_pc_sqm = exp_pc_sqm
                p.coverage_per_pc_sqft = exp_pc_sqft
                p.coverage_per_box_sqm = exp_box_sqm
                p.coverage_per_box_sqft = exp_box_sqft
                fixes["product_coverage_sync"] += 1
                fixes_applied.append("sync_coverage_from_subcategory")
                if status == "clean":
                    status = "fixed"

            # Derived make/size consistency marker.
            if not sc.make_type_id or sc.make_type_id not in make_by_id:
                if "invalid_make_type_id" not in issues:
                    issues.append("invalid_make_type_id_via_subcategory")
                status = "needs-fix"

            rows.append(
                {
                    "entity_type": "product",
                    "entity_id": str(p.id),
                    "name": f"{p.brand} {p.name}",
                    "status": status,
                    "issues": "|".join(issues) if issues else "",
                    "fixes_applied": "|".join(fixes_applied) if fixes_applied else "",
                }
            )

        db.commit()

        # Write matrix.
        with out_csv.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(
                f,
                fieldnames=["entity_type", "entity_id", "name", "status", "issues", "fixes_applied"],
            )
            writer.writeheader()
            writer.writerows(rows)

        counts = {"clean": 0, "fixed": 0, "needs-fix": 0}
        for r in rows:
            counts[r["status"]] += 1
        print(f"matrix_csv={out_csv.resolve()}")
        print(f"summary={counts}")
        print(f"fixes={fixes}")
    finally:
        db.close()


if __name__ == "__main__":
    main()

