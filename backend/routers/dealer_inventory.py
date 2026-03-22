"""Dealer tile categories (subcategories), listing products in a category, and search."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import (
    ApplicationType,
    BodyType,
    MakeType,
    Product,
    Size,
    SubCategory,
    User,
)
from services.coverage import coverage_per_pc_for_subcategory, coverage_per_pc_from_mm
from services.subcategory_defaults import resolve_dealer_subcategory_defaults
from services.tiles_category import get_or_create_tiles_category

router = APIRouter(prefix="/dealer", tags=["dealer"])


def _truthy_request_flag(value) -> bool:
    if value is True:
        return True
    if value is None or value is False:
        return False
    if isinstance(value, (int, float)) and value == 1:
        return True
    s = str(value).strip().lower()
    return s in ("1", "true", "yes", "on")


def _normalize_size_key(value: str | None) -> str:
    """Match SubCategory.size to Size.name despite spacing/quotes (e.g. 12x12 vs 12 x 12)."""
    if not value:
        return ""
    return value.lower().replace('"', "").replace(" ", "")


def _load_active_size_lookups(db: Session) -> tuple[dict[str, Size], dict[uuid.UUID, Size]]:
    key_lookup: dict[str, Size] = {}
    id_lookup: dict[uuid.UUID, Size] = {}
    for sz in db.query(Size).filter(Size.is_active == True).all():
        key = _normalize_size_key(sz.name)
        if key and key not in key_lookup:
            key_lookup[key] = sz
        id_lookup[sz.id] = sz
    return key_lookup, id_lookup


def _ref_size_record(
    subcat: SubCategory,
    key_lookup: dict[str, Size],
    id_lookup: dict[uuid.UUID, Size],
) -> Size | None:
    """Linked Size row for display + effective defaults."""
    ref = None
    if subcat.size_id is not None and subcat.size_id in id_lookup:
        ref = id_lookup[subcat.size_id]
    if ref is None:
        key = _normalize_size_key(subcat.size)
        ref = key_lookup.get(key) if key else None
    return ref


def _subcategory_display_sizes(
    subcat: SubCategory,
    key_lookup: dict[str, Size],
    id_lookup: dict[uuid.UUID, Size],
) -> tuple[str, str]:
    """(size_inches, size_mm) for API — prefer subcat.size_id, else string match to Size.name."""
    ref = _ref_size_record(subcat, key_lookup, id_lookup)
    if ref:
        size_inches = ref.name
        nm = ref.name_mm
        if nm and str(nm).strip():
            size_mm = str(nm).strip()
        else:
            size_mm = f"{ref.height_mm}mm x {ref.width_mm}mm"
        return size_inches, size_mm
    return (
        f'{subcat.height_inches}" x {subcat.width_inches}"',
        f"{subcat.height_mm}mm x {subcat.width_mm}mm",
    )


def _serialize_subcategory_base(
    db: Session,
    subcat: SubCategory,
    key_lookup: dict[str, Size],
    id_lookup: dict[uuid.UUID, Size],
) -> dict:
    """Common JSON shape for subcategory (list, nested, search, create)."""
    make_type = (
        db.query(MakeType).filter(MakeType.id == subcat.make_type_id).first()
        if subcat.make_type_id
        else None
    )
    ref = _ref_size_record(subcat, key_lookup, id_lookup)
    eff = resolve_dealer_subcategory_defaults(db, subcat, ref_size=ref)
    app_uuid = eff["application_type_id"]
    body_uuid = eff["body_type_id"]
    app_type = (
        db.query(ApplicationType).filter(ApplicationType.id == app_uuid).first() if app_uuid else None
    )
    body_type = db.query(BodyType).filter(BodyType.id == body_uuid).first() if body_uuid else None
    si, smm = _subcategory_display_sizes(subcat, key_lookup, id_lookup)
    return {
        "id": str(subcat.id),
        "name": subcat.name,
        "size": subcat.size,
        "size_id": str(subcat.size_id) if subcat.size_id else None,
        "size_inches": si,
        "size_mm": smm,
        "make_type": make_type.name if make_type else "",
        "make_type_id": str(subcat.make_type_id) if subcat.make_type_id else None,
        "application_type_id": str(app_uuid) if app_uuid else None,
        "application_type": app_type.name if app_type else "",
        "body_type_id": str(body_uuid) if body_uuid else None,
        "body_type": body_type.name if body_type else "",
        "default_packing_per_box": eff["default_packing_per_box"],
    }


@router.get("/subcategories")
async def get_subcategories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.user_type != "dealer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dealers can access this endpoint",
        )

    tiles_category = get_or_create_tiles_category(db)

    subcategories = (
        db.query(SubCategory)
        .filter(
            SubCategory.category_id == tiles_category.id,
            SubCategory.is_active == True,
        )
        .all()
    )

    key_lookup, id_lookup = _load_active_size_lookups(db)
    result = []
    for subcat in subcategories:
        product_count = (
            db.query(func.count(Product.id))
            .filter(
                Product.sub_category_id == subcat.id,
                Product.merchant_id == current_user.merchant_id,
                Product.is_active == True,
            )
            .scalar()
        )
        total_quantity = (
            db.query(func.sum(Product.current_quantity))
            .filter(
                Product.sub_category_id == subcat.id,
                Product.merchant_id == current_user.merchant_id,
                Product.is_active == True,
            )
            .scalar()
            or 0
        )
        row = _serialize_subcategory_base(db, subcat, key_lookup, id_lookup)
        row["product_count"] = product_count or 0
        row["total_quantity"] = int(total_quantity)
        result.append(row)

    result.sort(key=lambda x: x["name"])
    return {"subcategories": result}


@router.delete("/subcategories/{subcategory_id}")
async def deactivate_subcategory(
    subcategory_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Soft-delete for this dealer: deactivate their products in this subcategory.
    If no active products remain in the subcategory (any merchant), mark the subcategory inactive.
    """
    if current_user.user_type != "dealer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dealers can access this endpoint",
        )
    if not current_user.merchant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dealer account has no merchant",
        )

    tiles_category = get_or_create_tiles_category(db)
    subcat = (
        db.query(SubCategory)
        .filter(
            SubCategory.id == subcategory_id,
            SubCategory.category_id == tiles_category.id,
        )
        .first()
    )
    if not subcat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sub-category not found",
        )

    now = datetime.now(timezone.utc)

    dealer_active_count = (
        db.query(func.count(Product.id))
        .filter(
            Product.sub_category_id == subcategory_id,
            Product.merchant_id == current_user.merchant_id,
            Product.is_active == True,
        )
        .scalar()
        or 0
    )

    db.query(Product).filter(
        Product.sub_category_id == subcategory_id,
        Product.merchant_id == current_user.merchant_id,
        Product.is_active == True,
    ).update(
        {Product.is_active: False, Product.updated_at: now},
        synchronize_session=False,
    )

    remaining_any_merchant = (
        db.query(func.count(Product.id))
        .filter(
            Product.sub_category_id == subcategory_id,
            Product.is_active == True,
        )
        .scalar()
        or 0
    )

    subcategory_deactivated = False
    if remaining_any_merchant == 0:
        subcat.is_active = False
        subcat.updated_at = now
        subcategory_deactivated = True

    db.commit()

    return {
        "message": "Sub-category removed from your inventory"
        + (" and hidden (no remaining stock)." if subcategory_deactivated else "."),
        "products_deactivated": int(dealer_active_count),
        "subcategory_deactivated": subcategory_deactivated,
    }


@router.get("/subcategories/{subcategory_id}/products")
async def get_products_in_subcategory(
    subcategory_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.user_type != "dealer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dealers can access this endpoint",
        )

    subcat = db.query(SubCategory).filter(SubCategory.id == subcategory_id).first()
    if not subcat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sub-category not found",
        )

    key_lookup, id_lookup = _load_active_size_lookups(db)

    products = (
        db.query(Product)
        .filter(
            Product.sub_category_id == subcategory_id,
            Product.merchant_id == current_user.merchant_id,
            Product.is_active == True,
        )
        .all()
    )

    product_list = []
    for product in products:
        product_list.append(
            {
                "id": str(product.id),
                "brand": product.brand,
                "name": product.name,
                "sku": product.sku,
                "surface_type": product.surface_type_name or "",
                "application_type": product.application_type_name or "",
                "body_type": product.body_type_name or "",
                "quality": product.quality_name or "",
                "current_quantity": product.current_quantity,
                "packing_per_box": product.packing_per_box,
                "coverage_per_pc_sqm": product.coverage_per_pc_sqm,
                "coverage_per_pc_sqft": product.coverage_per_pc_sqft,
                "coverage_per_box_sqm": product.coverage_per_box_sqm,
                "coverage_per_box_sqft": product.coverage_per_box_sqft,
                "primary_image_url": product.primary_image_url,
            }
        )

    return {
        "subcategory": _serialize_subcategory_base(db, subcat, key_lookup, id_lookup),
        "products": product_list,
    }


@router.post("/subcategories")
async def create_subcategory(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.user_type != "dealer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dealers can access this endpoint",
        )

    size_id_param = request.get("size_id")
    size = request.get("size")
    if not size_id_param and not size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either size or size_id is required",
        )

    application_type_id_param = request.get("application_type_id")
    if not application_type_id_param:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="application_type_id is required",
        )
    try:
        application_type_uuid = uuid.UUID(str(application_type_id_param))
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid application_type_id",
        )
    app_type_row = (
        db.query(ApplicationType)
        .filter(ApplicationType.id == application_type_uuid, ApplicationType.is_active == True)
        .first()
    )
    if not app_type_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application type not found",
        )

    make_type_id_param = request.get("make_type_id")
    make_type_id_val: uuid.UUID | None = None
    make_type: MakeType | None = None
    if make_type_id_param not in (None, ""):
        try:
            make_type_id_val = uuid.UUID(str(make_type_id_param))
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid make_type_id",
            )
        make_type = (
            db.query(MakeType)
            .filter(MakeType.id == make_type_id_val, MakeType.is_active == True)
            .first()
        )
        if not make_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Make type not found",
            )

    tiles_category = get_or_create_tiles_category(db)

    ref_size: Size | None = None
    size_id_val: uuid.UUID | None = None

    if size_id_param:
        try:
            sid = uuid.UUID(str(size_id_param))
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid size_id",
            )
        ref_size = db.query(Size).filter(Size.id == sid, Size.is_active == True).first()
        if not ref_size:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tile size not found",
            )
        size = ref_size.name
        height_inches = ref_size.height_inches
        width_inches = ref_size.width_inches
        height_mm = ref_size.height_mm
        width_mm = ref_size.width_mm
        size_id_val = ref_size.id
    else:
        if not size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either size or size_id is required",
            )
        try:
            parts = size.lower().replace('"', "").replace(" ", "").split("x")
            height_inches = int(parts[0])
            width_inches = int(parts[1])
            height_mm = int(height_inches * 25.4)
            width_mm = int(width_inches * 25.4)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid size format. Use format like '12x12'",
            )
        key_lookup, _ = _load_active_size_lookups(db)
        ref_size = key_lookup.get(_normalize_size_key(size))
        if ref_size:
            size = ref_size.name
            height_inches = ref_size.height_inches
            width_inches = ref_size.width_inches
            height_mm = ref_size.height_mm
            width_mm = ref_size.width_mm
            size_id_val = ref_size.id

    body_type_id_param = request.get("body_type_id")
    body_type_id_val: uuid.UUID | None = None
    body_type_row: BodyType | None = None

    if make_type_id_val:
        if make_type and make_type.body_type_id:
            body_type_id_val = make_type.body_type_id
            body_type_row = db.query(BodyType).filter(BodyType.id == body_type_id_val).first()
            if not body_type_row:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Make type has an invalid body type; send body_type_id explicitly",
                )
        else:
            if not body_type_id_param:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This make type has no linked body type; send body_type_id explicitly",
                )
            try:
                body_type_id_val = uuid.UUID(str(body_type_id_param))
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid body_type_id",
                )
            body_type_row = (
                db.query(BodyType)
                .filter(BodyType.id == body_type_id_val, BodyType.is_active == True)
                .first()
            )
            if not body_type_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Body type not found",
                )
    else:
        if body_type_id_param not in (None, ""):
            try:
                body_type_id_val = uuid.UUID(str(body_type_id_param))
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid body_type_id",
                )
            body_type_row = (
                db.query(BodyType)
                .filter(BodyType.id == body_type_id_val, BodyType.is_active == True)
                .first()
            )
            if not body_type_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Body type not found",
                )
        elif ref_size is not None and ref_size.body_type_id is not None:
            body_type_id_val = ref_size.body_type_id
            body_type_row = (
                db.query(BodyType)
                .filter(BodyType.id == body_type_id_val, BodyType.is_active == True)
                .first()
            )
            if not body_type_row:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Tile size references an invalid body type",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "body_type_id is required when make_type_id is omitted "
                    "(or set body type on the tile size in admin)"
                ),
            )

    dpack_raw = request.get("default_packing_per_box")
    if dpack_raw is not None and str(dpack_raw).strip() != "":
        try:
            default_packing = int(dpack_raw)
            if default_packing < 1:
                raise ValueError()
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="default_packing_per_box must be a positive integer",
            )
    elif ref_size is not None:
        default_packing = ref_size.default_packaging_per_box
    else:
        default_packing = 10

    base_q = db.query(SubCategory).filter(SubCategory.category_id == tiles_category.id)
    if make_type_id_val:
        base_q = base_q.filter(SubCategory.make_type_id == make_type_id_val)
    else:
        base_q = base_q.filter(SubCategory.make_type_id.is_(None))
    if size_id_val:
        existing = base_q.filter(
            or_(SubCategory.size_id == size_id_val, SubCategory.size == size)
        ).first()
    else:
        existing = base_q.filter(SubCategory.size == size).first()

    key_lookup, id_lookup = _load_active_size_lookups(db)

    if make_type:
        desired_name = f"{size.upper()} {make_type.name.upper()}"
    else:
        desired_name = f"{size.upper()} {body_type_row.name.upper()}"

    cov_sqm, cov_sqft = coverage_per_pc_from_mm(width_mm, height_mm)

    if existing:
        if existing.is_active:
            if size_id_val and existing.size_id is None:
                existing.size_id = size_id_val
                db.commit()
                db.refresh(existing)
            return {
                "exists": True,
                "reactivated": False,
                "products_reactivated": 0,
                "message": f"Sub-category '{existing.name}' already exists",
                "subcategory": _serialize_subcategory_base(db, existing, key_lookup, id_lookup),
            }

        # Same size/make key exists but was soft-deleted — reactivate the category row.
        # By default, products stay inactive; optional reactivate_products turns this merchant's
        # inactive products in this subcategory back on (explicit opt-in).
        existing.is_active = True
        existing.name = desired_name
        existing.size = size
        existing.height_inches = height_inches
        existing.width_inches = width_inches
        existing.height_mm = height_mm
        existing.width_mm = width_mm
        existing.make_type_id = make_type_id_val
        if size_id_val is not None:
            existing.size_id = size_id_val
        existing.application_type_id = application_type_uuid
        existing.body_type_id = body_type_id_val
        existing.default_application_type_name = app_type_row.name
        existing.default_body_type_name = body_type_row.name
        existing.default_packing_per_box = default_packing
        existing.coverage_per_pc_sqm = cov_sqm
        existing.coverage_per_pc_sqft = cov_sqft
        now = datetime.now(timezone.utc)
        existing.updated_at = now

        products_reactivated = 0
        if (
            _truthy_request_flag(request.get("reactivate_products"))
            and current_user.merchant_id
        ):
            products_reactivated = (
                db.query(Product)
                .filter(
                    Product.sub_category_id == existing.id,
                    Product.merchant_id == current_user.merchant_id,
                    Product.is_active == False,
                )
                .update(
                    {Product.is_active: True, Product.updated_at: now},
                    synchronize_session=False,
                )
            )

        db.commit()
        db.refresh(existing)

        msg = f"Sub-category '{desired_name}' was restored"
        if products_reactivated:
            msg += f" ({int(products_reactivated)} product(s) reactivated)"

        return {
            "exists": False,
            "reactivated": True,
            "products_reactivated": int(products_reactivated),
            "message": msg,
            "subcategory": _serialize_subcategory_base(db, existing, key_lookup, id_lookup),
        }

    new_subcat = SubCategory(
        category_id=tiles_category.id,
        name=desired_name,
        size=size,
        height_inches=height_inches,
        width_inches=width_inches,
        height_mm=height_mm,
        width_mm=width_mm,
        make_type_id=make_type_id_val,
        size_id=size_id_val,
        application_type_id=application_type_uuid,
        body_type_id=body_type_id_val,
        default_application_type_name=app_type_row.name,
        default_body_type_name=body_type_row.name,
        default_packing_per_box=default_packing,
        coverage_per_pc_sqm=cov_sqm,
        coverage_per_pc_sqft=cov_sqft,
    )
    db.add(new_subcat)
    db.commit()
    db.refresh(new_subcat)

    return {
        "exists": False,
        "reactivated": False,
        "products_reactivated": 0,
        "message": f"Sub-category '{desired_name}' created successfully",
        "subcategory": _serialize_subcategory_base(db, new_subcat, key_lookup, id_lookup),
    }


@router.get("/search")
async def universal_search(
    q: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.user_type != "dealer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dealers can access this endpoint",
        )

    if not q or len(q.strip()) < 2:
        return {"subcategories": [], "products": [], "total_results": 0}

    query = q.lower().strip()
    tiles_category = get_or_create_tiles_category(db)
    subcategories_results = []

    if tiles_category:
        subcats = (
            db.query(SubCategory)
            .filter(
                SubCategory.category_id == tiles_category.id,
                SubCategory.is_active == True,
            )
            .all()
        )
        key_lookup, id_lookup = _load_active_size_lookups(db)

        for subcat in subcats:
            make_type = (
                db.query(MakeType).filter(MakeType.id == subcat.make_type_id).first()
                if subcat.make_type_id
                else None
            )
            ref = _ref_size_record(subcat, key_lookup, id_lookup)
            eff = resolve_dealer_subcategory_defaults(db, subcat, ref_size=ref)
            app_type = (
                db.query(ApplicationType).filter(ApplicationType.id == eff["application_type_id"]).first()
                if eff["application_type_id"]
                else None
            )
            body_type = (
                db.query(BodyType).filter(BodyType.id == eff["body_type_id"]).first()
                if eff["body_type_id"]
                else None
            )
            if (
                query in subcat.name.lower()
                or query in subcat.size.lower()
                or query in f"{subcat.height_mm}".lower()
                or query in f"{subcat.width_mm}".lower()
                or (make_type and query in make_type.name.lower())
                or (app_type and query in app_type.name.lower())
                or (body_type and query in body_type.name.lower())
            ):
                product_count = (
                    db.query(func.count(Product.id))
                    .filter(
                        Product.sub_category_id == subcat.id,
                        Product.merchant_id == current_user.merchant_id,
                        Product.is_active == True,
                    )
                    .scalar()
                )
                row = _serialize_subcategory_base(db, subcat, key_lookup, id_lookup)
                row["product_count"] = product_count or 0
                row["type"] = "subcategory"
                subcategories_results.append(row)

    products = (
        db.query(Product)
        .filter(
            Product.merchant_id == current_user.merchant_id,
            Product.is_active == True,
        )
        .all()
    )

    products_results = []
    for product in products:
        subcat = db.query(SubCategory).filter(SubCategory.id == product.sub_category_id).first()
        surf = (product.surface_type_name or "").lower()
        qual = (product.quality_name or "").lower()

        if (
            query in product.brand.lower()
            or query in product.name.lower()
            or (product.sku and query in product.sku.lower())
            or (surf and query in surf)
            or (qual and query in qual)
        ):
            products_results.append(
                {
                    "id": str(product.id),
                    "brand": product.brand,
                    "name": product.name,
                    "sku": product.sku,
                    "surface_type": product.surface_type_name or "",
                    "quality": product.quality_name or "",
                    "current_quantity": product.current_quantity,
                    "subcategory_id": str(product.sub_category_id),
                    "subcategory_name": subcat.name if subcat else "",
                    "type": "product",
                }
            )

    return {
        "subcategories": subcategories_results[:10],
        "products": products_results[:10],
        "total_results": len(subcategories_results) + len(products_results),
    }
