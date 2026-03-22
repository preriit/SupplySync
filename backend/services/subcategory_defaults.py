"""Effective subcategory defaults for dealer UI and product create.

Falls back when sub_categories.application_type_id / body_type_id / default_packing
are unset (legacy rows): use linked Size row, then MakeType.body_type_id.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from models import MakeType, Size, SubCategory


def _normalize_size_key(value: str | None) -> str:
    if not value:
        return ""
    return value.lower().replace('"', "").replace(" ", "")


def _ref_size_from_db(db: Session, subcat: SubCategory) -> Size | None:
    """Resolve Size row from size_id or normalized size string (no prebuilt lookup)."""
    if subcat.size_id:
        s = db.query(Size).filter(Size.id == subcat.size_id, Size.is_active == True).first()
        if s:
            return s
    if not subcat.size:
        return None
    key = _normalize_size_key(subcat.size)
    if not key:
        return None
    for sz in db.query(Size).filter(Size.is_active == True).all():
        if _normalize_size_key(sz.name) == key:
            return sz
    return None


def resolve_dealer_subcategory_defaults(
    db: Session,
    subcat: SubCategory,
    *,
    ref_size: Size | None = None,
) -> dict:
    """
    Return effective UUIDs / packing for API + product POST.

    Priority:
      application_type_id: subcat → ref_size.application_type_id
      body_type_id: subcat → ref_size.body_type_id → make_type.body_type_id
      default_packing_per_box: linked Size default_packaging_per_box when subcat still has
        placeholder 10; else subcat when dealer overrode; else 0 when unknown (not 10)
    """
    if ref_size is None:
        ref_size = _ref_size_from_db(db, subcat)

    app_id = subcat.application_type_id
    if app_id is None and ref_size is not None and ref_size.application_type_id is not None:
        app_id = ref_size.application_type_id

    body_id = subcat.body_type_id
    if body_id is None and ref_size is not None and ref_size.body_type_id is not None:
        body_id = ref_size.body_type_id
    if body_id is None and subcat.make_type_id is not None:
        mt = db.query(MakeType).filter(MakeType.id == subcat.make_type_id).first()
        if mt is not None and mt.body_type_id is not None:
            body_id = mt.body_type_id

    # Packing: sub_categories.default_packing_per_box often stuck at ORM/DB default (10)
    # even when the linked Size row has the real default_packaging_per_box (e.g. 4).
    sub_pack = subcat.default_packing_per_box
    ref_pack = None
    if ref_size is not None and getattr(ref_size, "default_packaging_per_box", None) is not None:
        ref_pack = int(ref_size.default_packaging_per_box)

    if ref_pack is not None:
        if sub_pack is None or int(sub_pack) == ref_pack:
            packing = ref_pack
        elif int(sub_pack) == 10 and ref_pack != 10:
            # Legacy / placeholder 10 — prefer admin size default
            packing = ref_pack
        else:
            # Dealer explicitly set a value different from size (e.g. 8 vs size 4)
            packing = int(sub_pack)
    else:
        packing = int(sub_pack) if sub_pack is not None else None
    if packing is None:
        packing = 0

    return {
        "application_type_id": app_id,
        "body_type_id": body_id,
        "default_packing_per_box": int(packing),
    }
