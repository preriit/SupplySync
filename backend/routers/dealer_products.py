"""Dealer product CRUD, stock transactions, and activity log."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import (
    ApplicationType,
    BodyType,
    Product,
    ProductActivityLog,
    ProductTransaction,
    Quality,
    SubCategory,
    SurfaceType,
    User,
)
from services.coverage import (
    coverage_per_box_from_pc,
    coverage_per_pc_for_subcategory,
)
from services.product_activity import log_product_activity
from services.product_snapshots import (
    refresh_product_snapshot_labels,
    snapshot_labels_for_new_product,
)
from services.subcategory_defaults import resolve_dealer_subcategory_defaults
from services.transaction_reconciliation import analyze_product_transactions

router = APIRouter(prefix="/dealer", tags=["dealer"])


def _ensure_product_pc_coverage(product: Product, db: Session) -> tuple[float, float]:
    """Snapshot per-piece coverage on product; fill from subcategory if missing."""
    if product.coverage_per_pc_sqm is not None:
        return float(product.coverage_per_pc_sqm), float(product.coverage_per_pc_sqft)
    subcat = db.query(SubCategory).filter(SubCategory.id == product.sub_category_id).first()
    if not subcat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sub-category not found for product",
        )
    sqm, sqft = coverage_per_pc_for_subcategory(subcat)
    product.coverage_per_pc_sqm = sqm
    product.coverage_per_pc_sqft = sqft
    return sqm, sqft


def _set_product_box_coverage(product: Product, db: Session) -> None:
    pc_sqm, pc_sqft = _ensure_product_pc_coverage(product, db)
    product.coverage_per_box_sqm, product.coverage_per_box_sqft = coverage_per_box_from_pc(
        pc_sqm, pc_sqft, product.packing_per_box
    )


def _looks_like_phone_identifier(value: str | None) -> bool:
    if not value:
        return False
    compact = str(value).strip().replace(" ", "").replace("-", "")
    if compact.startswith("+"):
        compact = compact[1:]
    return compact.isdigit() and len(compact) >= 7


def _user_display_name(user: User | None) -> str:
    if not user:
        return "Unknown"
    username = (user.username or "").strip()
    email = (user.email or "").strip()
    if username and not _looks_like_phone_identifier(username):
        return username
    if email:
        return email
    if username:
        return username
    if user.phone:
        return str(user.phone)
    return "Unknown"


@router.post("/products")
async def create_product(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.user_type != "dealer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dealers can access this endpoint",
        )

    required_fields = [
        "sub_category_id",
        "brand",
        "name",
        "surface_type_id",
        "quality_id",
        "current_quantity",
    ]
    for field in required_fields:
        if field not in request or request[field] is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Field '{field}' is required",
            )

    subcat = (
        db.query(SubCategory)
        .filter(SubCategory.id == request["sub_category_id"])
        .first()
    )
    if not subcat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sub-category not found",
        )

    eff = resolve_dealer_subcategory_defaults(db, subcat)

    application_type_id = request.get("application_type_id")
    if application_type_id in (None, ""):
        application_type_id = eff["application_type_id"]
    if application_type_id in (None, ""):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="application_type_id is required (set on sub-category, tile size, or request)",
        )

    body_type_id = request.get("body_type_id")
    if body_type_id in (None, ""):
        body_type_id = eff["body_type_id"]
    if body_type_id in (None, ""):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="body_type_id is required (set on sub-category, tile size, make type, or request)",
        )

    packing_raw = request.get("packing_per_box")
    if packing_raw in (None, ""):
        packing_per_box = eff["default_packing_per_box"]
    else:
        try:
            packing_per_box = int(packing_raw)
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="packing_per_box must be an integer",
            )
    if packing_per_box < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="packing_per_box must be at least 1 (enter a value if subcategory/tile size has no default)",
        )

    pc_sqm, pc_sqft = coverage_per_pc_for_subcategory(subcat)
    box_sqm, box_sqft = coverage_per_box_from_pc(pc_sqm, pc_sqft, packing_per_box)

    existing = (
        db.query(Product)
        .filter(
            Product.merchant_id == current_user.merchant_id,
            Product.sub_category_id == request["sub_category_id"],
            Product.brand == request["brand"],
            Product.name == request["name"],
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product '{request['brand']} {request['name']}' already exists in this category",
        )

    labels = snapshot_labels_for_new_product(
        db,
        subcat,
        request["surface_type_id"],
        application_type_id,
        body_type_id,
        request["quality_id"],
    )

    new_product = Product(
        merchant_id=current_user.merchant_id,
        sub_category_id=request["sub_category_id"],
        brand=request["brand"],
        name=request["name"],
        sku=request.get("sku"),
        surface_type_id=request["surface_type_id"],
        application_type_id=application_type_id,
        body_type_id=body_type_id,
        quality_id=request["quality_id"],
        surface_type_name=labels["surface_type_name"] or None,
        application_type_name=labels["application_type_name"] or None,
        body_type_name=labels["body_type_name"] or None,
        quality_name=labels["quality_name"] or None,
        current_quantity=request["current_quantity"],
        packing_per_box=packing_per_box,
        coverage_per_pc_sqm=pc_sqm,
        coverage_per_pc_sqft=pc_sqft,
        coverage_per_box_sqm=box_sqm,
        coverage_per_box_sqft=box_sqft,
        primary_image_url=request.get("primary_image_url"),
        is_active=True,
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)

    log_product_activity(
        db=db,
        product_id=str(new_product.id),
        merchant_id=str(current_user.merchant_id),
        user_id=str(current_user.id),
        activity_type="created",
        description=f"Product created: {new_product.brand} {new_product.name}",
    )
    db.commit()

    return {
        "message": f"Product '{request['brand']} {request['name']}' created successfully",
        "product": {
            "id": str(new_product.id),
            "brand": new_product.brand,
            "name": new_product.name,
            "quantity": new_product.current_quantity,
        },
    }


@router.get("/products/{product_id}")
async def get_product_detail(
    product_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.user_type != "dealer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dealers can access this endpoint",
        )

    product = (
        db.query(Product)
        .filter(
            Product.id == product_id,
            Product.merchant_id == current_user.merchant_id,
        )
        .first()
    )
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    sub_category = (
        db.query(SubCategory).filter(SubCategory.id == product.sub_category_id).first()
    )
    surface_label = product.surface_type_name
    application_label = product.application_type_name
    body_label = product.body_type_name
    quality_label = product.quality_name
    if not surface_label:
        st = db.query(SurfaceType).filter(SurfaceType.id == product.surface_type_id).first()
        surface_label = st.name if st else ""
    if not application_label:
        at = (
            db.query(ApplicationType).filter(ApplicationType.id == product.application_type_id).first()
        )
        application_label = at.name if at else ""
    if not body_label:
        bt = db.query(BodyType).filter(BodyType.id == product.body_type_id).first()
        body_label = bt.name if bt else ""
    if not quality_label:
        qu = db.query(Quality).filter(Quality.id == product.quality_id).first()
        quality_label = qu.name if qu else ""

    return {
        "product": {
            "id": str(product.id),
            "sub_category_id": str(product.sub_category_id),
            "sub_category_name": sub_category.name if sub_category else "",
            "size_mm": f"{sub_category.height_mm}mm x {sub_category.width_mm}mm" if sub_category else "",
            "brand": product.brand,
            "name": product.name,
            "sku": product.sku,
            "surface_type_id": str(product.surface_type_id),
            "surface_type": surface_label or "",
            "application_type_id": str(product.application_type_id),
            "application_type": application_label or "",
            "body_type_id": str(product.body_type_id),
            "body_type": body_label or "",
            "quality_id": str(product.quality_id),
            "quality": quality_label or "",
            "current_quantity": product.current_quantity,
            "packing_per_box": product.packing_per_box,
            "coverage_per_pc_sqm": product.coverage_per_pc_sqm,
            "coverage_per_pc_sqft": product.coverage_per_pc_sqft,
            "coverage_per_box_sqm": product.coverage_per_box_sqm,
            "coverage_per_box_sqft": product.coverage_per_box_sqft,
            "primary_image_url": product.primary_image_url,
            "is_active": product.is_active,
            "created_at": product.created_at.isoformat() if product.created_at else None,
            "updated_at": product.updated_at.isoformat() if product.updated_at else None,
        }
    }


@router.put("/products/{product_id}")
async def update_product(
    product_id: str,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.user_type != "dealer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dealers can access this endpoint",
        )

    product = (
        db.query(Product)
        .filter(
            Product.id == product_id,
            Product.merchant_id == current_user.merchant_id,
        )
        .first()
    )
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    changes_made = []

    def get_name_by_id(model, id_value):
        if not id_value:
            return None
        obj = db.query(model).filter(model.id == id_value).first()
        return obj.name if obj else str(id_value)

    if "brand" in request and request["brand"] != product.brand:
        changes_made.append(
            {"field": "brand", "old_value": product.brand, "new_value": request["brand"]}
        )
        product.brand = request["brand"]

    if "name" in request and request["name"] != product.name:
        changes_made.append(
            {"field": "name", "old_value": product.name, "new_value": request["name"]}
        )
        product.name = request["name"]

    if "sku" in request and request["sku"] != product.sku:
        changes_made.append(
            {
                "field": "sku",
                "old_value": product.sku or "Not set",
                "new_value": request["sku"] or "Not set",
            }
        )
        product.sku = request["sku"]

    if "surface_type_id" in request and request["surface_type_id"] != str(
        product.surface_type_id
    ):
        old_name = get_name_by_id(SurfaceType, product.surface_type_id)
        new_name = get_name_by_id(SurfaceType, request["surface_type_id"])
        changes_made.append(
            {"field": "surface_type", "old_value": old_name, "new_value": new_name}
        )
        product.surface_type_id = request["surface_type_id"]

    if "application_type_id" in request and request["application_type_id"] != str(
        product.application_type_id
    ):
        old_name = get_name_by_id(ApplicationType, product.application_type_id)
        new_name = get_name_by_id(ApplicationType, request["application_type_id"])
        changes_made.append(
            {"field": "application_type", "old_value": old_name, "new_value": new_name}
        )
        product.application_type_id = request["application_type_id"]

    if "body_type_id" in request and request["body_type_id"] != str(product.body_type_id):
        old_name = get_name_by_id(BodyType, product.body_type_id)
        new_name = get_name_by_id(BodyType, request["body_type_id"])
        changes_made.append(
            {"field": "body_type", "old_value": old_name, "new_value": new_name}
        )
        product.body_type_id = request["body_type_id"]

    if "quality_id" in request and request["quality_id"] != str(product.quality_id):
        old_name = get_name_by_id(Quality, product.quality_id)
        new_name = get_name_by_id(Quality, request["quality_id"])
        changes_made.append(
            {"field": "quality", "old_value": old_name, "new_value": new_name}
        )
        product.quality_id = request["quality_id"]

    if "packing_per_box" in request:
        try:
            new_packing = int(request["packing_per_box"])
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="packing_per_box must be an integer",
            )
        if new_packing < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="packing_per_box must be at least 1",
            )
        if new_packing != product.packing_per_box:
            changes_made.append(
                {
                    "field": "packing_per_box",
                    "old_value": f"{product.packing_per_box} pieces",
                    "new_value": f"{new_packing} pieces",
                }
            )
            product.packing_per_box = new_packing
            _set_product_box_coverage(product, db)

    if any(
        k in request
        for k in ("surface_type_id", "application_type_id", "body_type_id", "quality_id")
    ):
        refresh_product_snapshot_labels(product, db)

    product.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(product)

    if changes_made:
        log_product_activity(
            db=db,
            product_id=str(product.id),
            merchant_id=str(current_user.merchant_id),
            user_id=str(current_user.id),
            activity_type="edited",
            changes={"fields_changed": changes_made},
            description=f"Product edited: {len(changes_made)} field(s) updated",
        )
        db.commit()

    return {
        "message": "Product updated successfully",
        "product": {
            "id": str(product.id),
            "brand": product.brand,
            "name": product.name,
            "current_quantity": product.current_quantity,
            "packing_per_box": product.packing_per_box,
            "coverage_per_pc_sqm": product.coverage_per_pc_sqm,
            "coverage_per_pc_sqft": product.coverage_per_pc_sqft,
            "coverage_per_box_sqm": product.coverage_per_box_sqm,
            "coverage_per_box_sqft": product.coverage_per_box_sqft,
        },
    }


@router.delete("/products/{product_id}")
async def delete_product(
    product_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.user_type != "dealer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dealers can access this endpoint",
        )

    product = (
        db.query(Product)
        .filter(
            Product.id == product_id,
            Product.merchant_id == current_user.merchant_id,
        )
        .first()
    )
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    product.is_active = False
    product.updated_at = datetime.now(timezone.utc)
    db.commit()

    log_product_activity(
        db=db,
        product_id=str(product.id),
        merchant_id=str(current_user.merchant_id),
        user_id=str(current_user.id),
        activity_type="deleted",
        description=f"Product deleted: {product.brand} {product.name}",
    )
    db.commit()

    return {"message": f"Product '{product.brand} {product.name}' deleted successfully"}


@router.post("/products/{product_id}/transactions")
async def create_product_transaction(
    product_id: str,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.user_type != "dealer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dealers can access this endpoint",
        )

    transaction_type = request.get("transaction_type")
    quantity = request.get("quantity")

    if not transaction_type or transaction_type not in ["add", "subtract"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="transaction_type must be 'add' or 'subtract'",
        )

    if not quantity or not isinstance(quantity, int) or quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="quantity must be a positive integer",
        )

    product = (
        db.query(Product)
        .filter(
            Product.id == product_id,
            Product.merchant_id == current_user.merchant_id,
        )
        .first()
    )
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    quantity_before = product.current_quantity
    if transaction_type == "add":
        quantity_after = quantity_before + quantity
    else:
        quantity_after = quantity_before - quantity

    transaction = ProductTransaction(
        product_id=product.id,
        merchant_id=current_user.merchant_id,
        user_id=current_user.id,
        transaction_type=transaction_type,
        quantity=quantity,
        quantity_before=quantity_before,
        quantity_after=quantity_after,
        notes=request.get("notes"),
    )
    product.current_quantity = quantity_after

    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    db.refresh(product)

    log_product_activity(
        db=db,
        product_id=str(product.id),
        merchant_id=str(current_user.merchant_id),
        user_id=str(current_user.id),
        activity_type="quantity_add" if transaction_type == "add" else "quantity_subtract",
        changes={
            "quantity_change": quantity if transaction_type == "add" else -quantity,
            "from": quantity_before,
            "to": quantity_after,
        },
        description=f"{transaction_type.capitalize()} {quantity} boxes: {quantity_before} → {quantity_after}",
    )
    db.commit()

    return {
        "message": f"Transaction successful: {transaction_type} {quantity} boxes",
        "transaction": {
            "id": str(transaction.id),
            "type": transaction.transaction_type,
            "quantity": transaction.quantity,
            "quantity_before": transaction.quantity_before,
            "quantity_after": transaction.quantity_after,
            "created_at": transaction.created_at.isoformat(),
        },
        "product": {
            "id": str(product.id),
            "current_quantity": product.current_quantity,
        },
    }


@router.get("/products/{product_id}/transactions")
async def get_product_transactions(
    product_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50,
    normalized: bool = False,
):
    if current_user.user_type != "dealer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dealers can access this endpoint",
        )

    product = (
        db.query(Product)
        .filter(
            Product.id == product_id,
            Product.merchant_id == current_user.merchant_id,
        )
        .first()
    )
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    transactions = (
        db.query(ProductTransaction)
        .filter(ProductTransaction.product_id == product_id)
        .order_by(ProductTransaction.created_at.desc())
        .limit(limit)
        .all()
    )

    transaction_list = []
    review = analyze_product_transactions(transactions, product.current_quantity or 0) if normalized else None
    review_by_id = {row.txn_id: row for row in review.rows} if review else {}
    for txn in transactions:
        user = db.query(User).filter(User.id == txn.user_id).first()
        normalized_row = review_by_id.get(str(txn.id))
        transaction_list.append(
            {
                "id": str(txn.id),
                "transaction_type": txn.transaction_type,
                "quantity": txn.quantity,
                "quantity_before": txn.quantity_before,
                "quantity_after": txn.quantity_after,
                "normalized_quantity_before": normalized_row.normalized_before if normalized_row else None,
                "normalized_quantity_after": normalized_row.normalized_after if normalized_row else None,
                "normalized_transaction_type": normalized_row.effective_type if normalized_row else None,
                "delta_issue": normalized_row.delta_issue if normalized_row else "",
                "notes": txn.notes,
                "created_at": txn.created_at.isoformat(),
                "created_by": _user_display_name(user),
            }
        )

    return {
        "product": {
            "id": str(product.id),
            "brand": product.brand,
            "name": product.name,
            "current_quantity": product.current_quantity,
        },
        "transactions": transaction_list,
        "total_count": len(transaction_list),
        "normalized": normalized,
        "normalized_opening_balance": review.opening_balance if review else None,
        "normalized_baseline_opening_balance": review.baseline_opening_balance if review else None,
        "normalized_reconciliation_gap": review.reconciliation_gap if review else None,
        "normalized_has_issues": (
            bool(
                review.has_ambiguous_rows
                or review.has_negative_after_normalize
                or review.baseline_opening_balance < 0
                or review.reconciliation_gap != 0
                or review.projected_final != int(product.current_quantity or 0)
            )
            if review
            else None
        ),
    }


@router.get("/products/{product_id}/activity-log")
async def get_product_activity_log(
    product_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 100,
):
    if current_user.user_type != "dealer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dealers can access this endpoint",
        )

    product = (
        db.query(Product)
        .filter(
            Product.id == product_id,
            Product.merchant_id == current_user.merchant_id,
        )
        .first()
    )
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    activities = (
        db.query(ProductActivityLog)
        .filter(ProductActivityLog.product_id == product_id)
        .order_by(ProductActivityLog.created_at.desc())
        .limit(limit)
        .all()
    )

    activity_list = []
    for activity in activities:
        user = db.query(User).filter(User.id == activity.user_id).first()
        activity_list.append(
            {
                "id": str(activity.id),
                "activity_type": activity.activity_type,
                "changes": activity.changes,
                "description": activity.description,
                "created_at": activity.created_at.isoformat(),
                "created_by": _user_display_name(user),
            }
        )

    return {
        "product": {
            "id": str(product.id),
            "brand": product.brand,
            "name": product.name,
            "current_quantity": product.current_quantity,
        },
        "activities": activity_list,
        "total_count": len(activity_list),
    }
