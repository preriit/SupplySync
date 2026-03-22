"""Dealer home dashboard statistics."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Product, ProductActivityLog, User

router = APIRouter(prefix="/dealer", tags=["dealer"])


@router.get("/dashboard/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.user_type != "dealer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dealers can access this endpoint",
        )

    merchant_id = current_user.merchant_id

    total_products = db.query(func.count(Product.id)).filter(
        Product.merchant_id == merchant_id
    ).scalar()

    active_products = db.query(func.count(Product.id)).filter(
        Product.merchant_id == merchant_id,
        Product.is_active == True,
    ).scalar()

    low_stock = db.query(func.count(Product.id)).filter(
        Product.merchant_id == merchant_id,
        Product.current_quantity < 20,
        Product.current_quantity > 0,
    ).scalar()

    out_of_stock = db.query(func.count(Product.id)).filter(
        Product.merchant_id == merchant_id,
        Product.current_quantity == 0,
    ).scalar()

    inventory_value = 0

    recent_activities = (
        db.query(
            ProductActivityLog.activity_type,
            ProductActivityLog.description,
            ProductActivityLog.changes,
            ProductActivityLog.created_at,
            Product.brand,
            Product.name,
        )
        .join(Product, ProductActivityLog.product_id == Product.id)
        .filter(ProductActivityLog.merchant_id == merchant_id)
        .order_by(ProductActivityLog.created_at.desc())
        .limit(5)
        .all()
    )

    formatted_activities = []
    for activity in recent_activities:
        activity_type, description, changes, created_at, brand, product_name = activity
        tile_name = f"{brand} {product_name}" if brand and product_name else "Product"

        if activity_type == "created":
            title = f"Added new product: {tile_name}"
        elif activity_type == "edited":
            title = f"Updated product: {tile_name}"
        elif activity_type == "deleted":
            title = f"Deleted product: {tile_name}"
        elif activity_type == "quantity_add":
            if changes:
                quantity = changes.get("quantity_change", 1)
                before = changes.get("from", 0)
                after = changes.get("to", 0)
                title = f"Add {quantity} boxes {tile_name} : {before} → {after}"
            else:
                title = f"Added stock to {tile_name}"
        elif activity_type == "quantity_subtract":
            if changes:
                quantity = changes.get("quantity_change", 1)
                before = changes.get("from", 0)
                after = changes.get("to", 0)
                title = f"Subtract {quantity} boxes {tile_name} : {before} → {after}"
            else:
                title = f"Removed stock from {tile_name}"
        else:
            title = f"{activity_type.title()} {tile_name}"

        time_diff = datetime.now(timezone.utc) - created_at.replace(tzinfo=timezone.utc)
        if time_diff.days > 0:
            if time_diff.days == 1:
                time_ago = "Yesterday"
            elif time_diff.days < 7:
                time_ago = f"{time_diff.days} days ago"
            else:
                time_ago = created_at.strftime("%b %d, %Y")
        elif time_diff.seconds >= 3600:
            hours = time_diff.seconds // 3600
            time_ago = f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif time_diff.seconds >= 60:
            minutes = time_diff.seconds // 60
            time_ago = f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            time_ago = "Just now"

        formatted_activities.append(
            {"title": title, "time": time_ago, "action": activity_type}
        )

    return {
        "total_products": total_products or 0,
        "active_products": active_products or 0,
        "low_stock_items": low_stock or 0,
        "out_of_stock_items": out_of_stock or 0,
        "inventory_value": float(inventory_value),
        "recent_activity": formatted_activities,
    }
