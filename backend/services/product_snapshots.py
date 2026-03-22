"""Denormalized product attribute labels (snapshot at write time) to avoid N+1 reference lookups."""

from __future__ import annotations

from sqlalchemy.orm import Session

from models import (
    ApplicationType,
    BodyType,
    Product,
    Quality,
    SubCategory,
    SurfaceType,
)


def refresh_product_snapshot_labels(product: Product, db: Session) -> None:
    """Set name columns from current FKs (up to four lookups, once per product)."""
    st = (
        db.query(SurfaceType).filter(SurfaceType.id == product.surface_type_id).first()
        if product.surface_type_id
        else None
    )
    at = (
        db.query(ApplicationType).filter(ApplicationType.id == product.application_type_id).first()
        if product.application_type_id
        else None
    )
    bt = db.query(BodyType).filter(BodyType.id == product.body_type_id).first() if product.body_type_id else None
    qu = db.query(Quality).filter(Quality.id == product.quality_id).first() if product.quality_id else None
    product.surface_type_name = st.name if st else None
    product.application_type_name = at.name if at else None
    product.body_type_name = bt.name if bt else None
    product.quality_name = qu.name if qu else None


def snapshot_labels_for_new_product(
    db: Session,
    subcat: SubCategory,
    surface_type_id,
    application_type_id,
    body_type_id,
    quality_id,
) -> dict[str, str]:
    """
    Build label dict for a new product. Prefer subcategory snapshot strings for
    application/body when the chosen IDs match the subcategory row (copied defaults).
    """
    st = db.query(SurfaceType).filter(SurfaceType.id == surface_type_id).first()
    qu = db.query(Quality).filter(Quality.id == quality_id).first()

    app_name = ""
    if (
        getattr(subcat, "default_application_type_name", None)
        and subcat.application_type_id
        and str(subcat.application_type_id) == str(application_type_id)
    ):
        app_name = subcat.default_application_type_name or ""
    if not app_name:
        at = db.query(ApplicationType).filter(ApplicationType.id == application_type_id).first()
        app_name = at.name if at else ""

    body_name = ""
    if (
        getattr(subcat, "default_body_type_name", None)
        and subcat.body_type_id
        and str(subcat.body_type_id) == str(body_type_id)
    ):
        body_name = subcat.default_body_type_name or ""
    if not body_name:
        bt = db.query(BodyType).filter(BodyType.id == body_type_id).first()
        body_name = bt.name if bt else ""

    return {
        "surface_type_name": st.name if st else "",
        "application_type_name": app_name,
        "body_type_name": body_name,
        "quality_name": qu.name if qu else "",
    }
