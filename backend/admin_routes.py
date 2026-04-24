"""
Admin Routes for SupplySync Platform
Handles admin authentication and management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, case
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone, timedelta
from typing import List, Optional
import logging

from database import get_db
from models import User, Merchant, Product, ProductTransaction, SubCategory, Category, BodyType, MakeType, SurfaceType, ApplicationType, Size, Quality
from auth import get_password_hash, verify_password, create_access_token, get_current_user

# Create admin router
admin_router = APIRouter(prefix="/admin", tags=["Admin"])


def _coverage_per_pc_from_mm(width_mm: int, height_mm: int) -> tuple[float, float]:
    sqm = (float(width_mm) * float(height_mm)) / 1_000_000.0
    sqft = sqm * 10.764
    return sqm, sqft

# =====================================================
# Pydantic Models
# =====================================================

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str
    admin: dict

class UserListResponse(BaseModel):
    id: str
    username: str
    email: str
    phone: Optional[str]
    user_type: str
    role: Optional[str]
    is_active: bool
    is_verified: bool
    merchant_id: Optional[str]
    created_at: datetime
    last_login: Optional[datetime]
    deleted_at: Optional[datetime]

class MerchantListResponse(BaseModel):
    id: str
    name: str
    email: Optional[str]
    phone: Optional[str]
    city: Optional[str]
    state: Optional[str]
    subscription_status: Optional[str]
    subscription_expires_at: Optional[datetime]
    is_active: bool
    created_at: datetime

class UpdateUserStatusRequest(BaseModel):
    is_active: bool

class UpdateMerchantStatusRequest(BaseModel):
    is_active: bool
    subscription_status: Optional[str] = None

class DashboardStatsResponse(BaseModel):
    total_users: int
    total_merchants: int
    total_products: int
    body_types: int
    make_types: int
    application_types: int
    sizes: int
    active_subscriptions: int
    trial_subscriptions: int
    expired_subscriptions: int
    suspended_users: int


class AnalyticsKPIResponse(BaseModel):
    period_days: int
    dead_stock_days: int
    total_products: int
    products_with_movement: int
    total_units_added: int
    total_units_removed: int
    dead_stock_count: int
    avg_rotation_score: float

# =====================================================
# Helper Functions
# =====================================================

def get_current_admin(current_user: User = Depends(get_current_user)):
    """Verify that the current user is an admin"""
    if current_user.user_type != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

# =====================================================
# Admin Authentication Routes
# =====================================================

@admin_router.post("/auth/login", response_model=AdminLoginResponse)
async def admin_login(request: AdminLoginRequest, db: Session = Depends(get_db)):
    """Admin login endpoint - separate from dealer/subdealer login"""

    login_id = (request.username or "").strip()
    if not login_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is required",
        )

    # Find admin user by username only
    admin_user = db.query(User).filter(
        and_(
            User.username == login_id,
            User.user_type == 'admin'
        )
    ).first()
    
    if not admin_user or not verify_password(request.password, admin_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials"
        )
    
    if not admin_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is inactive"
        )
    
    # Update last login
    admin_user.last_login = datetime.now(timezone.utc)
    db.commit()
    
    # Create access token
    access_token = create_access_token(data={"sub": str(admin_user.id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "admin": {
            "id": str(admin_user.id),
            "username": admin_user.username,
            "email": admin_user.email,
            "role": admin_user.role,
            "user_type": admin_user.user_type
        }
    }

# =====================================================
# Admin Dashboard Routes
# =====================================================

@admin_router.get("/dashboard/stats", response_model=DashboardStatsResponse)
async def get_admin_dashboard_stats(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics for admin overview"""
    
    # Total users (excluding soft-deleted)
    total_users = db.query(User).filter(User.deleted_at.is_(None)).count()
    
    # Total merchants
    total_merchants = db.query(Merchant).filter(Merchant.deleted_at.is_(None)).count()
    
    # Total products
    total_products = db.query(Product).count()
    
    # Reference data counts (only active items)
    body_types_count = db.query(BodyType).filter(BodyType.is_active == True).count()
    make_types_count = db.query(MakeType).filter(MakeType.is_active == True).count()
    application_types_count = db.query(ApplicationType).filter(ApplicationType.is_active == True).count()
    sizes_count = db.query(Size).filter(Size.is_active == True).count()
    
    # Subscription stats
    active_subs = db.query(Merchant).filter(
        and_(
            Merchant.subscription_status == 'active',
            Merchant.deleted_at.is_(None)
        )
    ).count()
    
    trial_subs = db.query(Merchant).filter(
        and_(
            Merchant.subscription_status == 'trial',
            Merchant.deleted_at.is_(None)
        )
    ).count()
    
    expired_subs = db.query(Merchant).filter(
        and_(
            Merchant.subscription_status == 'expired',
            Merchant.deleted_at.is_(None)
        )
    ).count()
    
    # Suspended users
    suspended_users = db.query(User).filter(
        and_(
            User.is_active == False,
            User.deleted_at.is_(None)
        )
    ).count()
    
    return {
        "total_users": total_users,
        "total_merchants": total_merchants,
        "total_products": total_products,
        "body_types": body_types_count,
        "make_types": make_types_count,
        "application_types": application_types_count,
        "sizes": sizes_count,
        "active_subscriptions": active_subs,
        "trial_subscriptions": trial_subs,
        "expired_subscriptions": expired_subs,
        "suspended_users": suspended_users
    }


@admin_router.get("/analytics/inventory")
async def get_inventory_analytics(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
    days: int = 30,
    dead_stock_days: int = 60,
    limit: int = 8,
):
    """Inventory analytics: fast movers, dead stock, and rotation KPIs."""
    days = max(1, min(days, 365))
    dead_stock_days = max(1, min(dead_stock_days, 3650))
    limit = max(1, min(limit, 50))

    # DB timestamps are stored as naive UTC datetimes in this project, so keep
    # comparisons naive to avoid offset-aware/naive comparison errors.
    now = datetime.utcnow()
    period_start = now - timedelta(days=days)
    dead_stock_cutoff = now - timedelta(days=dead_stock_days)

    latest_tx_subquery = (
        db.query(
            ProductTransaction.product_id.label("product_id"),
            func.max(ProductTransaction.created_at).label("last_tx_at"),
        )
        .group_by(ProductTransaction.product_id)
        .subquery()
    )

    rows = (
        db.query(
            Product.id.label("product_id"),
            Product.name.label("product_name"),
            Product.brand.label("brand"),
            Product.current_quantity.label("current_quantity"),
            Merchant.name.label("merchant_name"),
            func.coalesce(
                func.sum(
                    case(
                        (ProductTransaction.transaction_type == "subtract", ProductTransaction.quantity),
                        else_=0,
                    )
                ),
                0,
            ).label("qty_out"),
            func.coalesce(
                func.sum(
                    case(
                        (ProductTransaction.transaction_type == "add", ProductTransaction.quantity),
                        else_=0,
                    )
                ),
                0,
            ).label("qty_in"),
            latest_tx_subquery.c.last_tx_at.label("last_tx_at"),
        )
        .join(Merchant, Merchant.id == Product.merchant_id)
        .outerjoin(
            ProductTransaction,
            and_(
                ProductTransaction.product_id == Product.id,
                ProductTransaction.created_at >= period_start,
            ),
        )
        .outerjoin(latest_tx_subquery, latest_tx_subquery.c.product_id == Product.id)
        .group_by(
            Product.id,
            Product.name,
            Product.brand,
            Product.current_quantity,
            Merchant.name,
            latest_tx_subquery.c.last_tx_at,
        )
        .all()
    )

    fast_movers = []
    dead_stock = []
    rotation_scores = []
    total_units_removed = 0
    total_units_added = 0
    products_with_movement = 0

    for row in rows:
        qty_out = int(row.qty_out or 0)
        qty_in = int(row.qty_in or 0)
        current_qty = int(row.current_quantity or 0)
        total_units_removed += qty_out
        total_units_added += qty_in

        if qty_out or qty_in:
            products_with_movement += 1

        rotation_score = 0.0
        baseline_stock = current_qty + qty_out
        if qty_out > 0:
            rotation_score = round(min(100.0, (qty_out / max(baseline_stock, 1)) * 100.0), 2)
            rotation_scores.append(rotation_score)
            fast_movers.append(
                {
                    "product_id": str(row.product_id),
                    "product_name": row.product_name,
                    "brand": row.brand,
                    "merchant_name": row.merchant_name,
                    "units_moved": qty_out,
                    "current_quantity": current_qty,
                    "rotation_score": rotation_score,
                }
            )

        last_tx_at = row.last_tx_at
        is_dead_stock = current_qty > 0 and (last_tx_at is None or last_tx_at < dead_stock_cutoff)
        if is_dead_stock:
            days_since_movement = dead_stock_days if last_tx_at is None else max(0, (now - last_tx_at).days)
            dead_stock.append(
                {
                    "product_id": str(row.product_id),
                    "product_name": row.product_name,
                    "brand": row.brand,
                    "merchant_name": row.merchant_name,
                    "current_quantity": current_qty,
                    "days_since_movement": days_since_movement,
                }
            )

    fast_movers.sort(key=lambda item: (item["units_moved"], item["rotation_score"]), reverse=True)
    dead_stock.sort(key=lambda item: (item["days_since_movement"], item["current_quantity"]), reverse=True)

    avg_rotation_score = round(sum(rotation_scores) / len(rotation_scores), 2) if rotation_scores else 0.0

    kpis = {
        "period_days": days,
        "dead_stock_days": dead_stock_days,
        "total_products": len(rows),
        "products_with_movement": products_with_movement,
        "total_units_added": total_units_added,
        "total_units_removed": total_units_removed,
        "dead_stock_count": len(dead_stock),
        "avg_rotation_score": avg_rotation_score,
    }

    return {
        "kpis": kpis,
        "fast_movers": fast_movers[:limit],
        "dead_stock": dead_stock[:limit],
    }

# =====================================================
# User Management Routes
# =====================================================

@admin_router.get("/users", response_model=List[UserListResponse])
async def get_all_users(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    user_type: Optional[str] = None,
    is_active: Optional[bool] = None
):
    """Get all users with optional filters"""
    
    query = db.query(User).filter(User.deleted_at.is_(None))
    
    if user_type:
        query = query.filter(User.user_type == user_type)
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "phone": user.phone,
            "user_type": user.user_type,
            "role": user.role,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "merchant_id": str(user.merchant_id) if user.merchant_id else None,
            "created_at": user.created_at,
            "last_login": user.last_login,
            "deleted_at": user.deleted_at
        }
        for user in users
    ]

@admin_router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    request: UpdateUserStatusRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Activate or deactivate a user (access control)"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent admin from deactivating themselves
    if str(user.id) == str(current_admin.id):
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    
    user.is_active = request.is_active
    db.commit()
    
    return {
        "message": f"User {'activated' if request.is_active else 'deactivated'} successfully",
        "user_id": str(user.id),
        "is_active": user.is_active
    }

@admin_router.delete("/users/{user_id}")
async def soft_delete_user(
    user_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Soft delete a user (sets deleted_at timestamp)"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent admin from deleting themselves
    if str(user.id) == str(current_admin.id):
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    user.deleted_at = datetime.now(timezone.utc)
    user.is_active = False
    db.commit()
    
    return {"message": "User deleted successfully (soft delete)"}

# =====================================================
# Merchant Management Routes
# =====================================================

@admin_router.get("/merchants", response_model=List[MerchantListResponse])
async def get_all_merchants(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    subscription_status: Optional[str] = None
):
    """Get all merchants with optional filters"""
    
    query = db.query(Merchant).filter(Merchant.deleted_at.is_(None))
    
    if subscription_status:
        query = query.filter(Merchant.subscription_status == subscription_status)
    
    merchants = query.order_by(Merchant.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": str(merchant.id),
            "name": merchant.name,
            "email": merchant.email,
            "phone": merchant.phone,
            "city": merchant.city,
            "state": merchant.state,
            "subscription_status": merchant.subscription_status,
            "subscription_expires_at": merchant.subscription_expires_at,
            "is_active": merchant.is_active,
            "created_at": merchant.created_at
        }
        for merchant in merchants
    ]

@admin_router.put("/merchants/{merchant_id}/status")
async def update_merchant_status(
    merchant_id: str,
    request: UpdateMerchantStatusRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update merchant status and subscription"""
    
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    merchant.is_active = request.is_active
    
    if request.subscription_status:
        merchant.subscription_status = request.subscription_status
    
    db.commit()
    
    return {
        "message": "Merchant status updated successfully",
        "merchant_id": str(merchant.id),
        "is_active": merchant.is_active,
        "subscription_status": merchant.subscription_status
    }

# =====================================================
# Reference Data Management Routes
# =====================================================

class ReferenceDataItem(BaseModel):
    name: str
    display_order: Optional[int] = 0
    body_type_id: Optional[str] = None  # For make_types and sizes


class ReferenceDataUpdateRequest(BaseModel):
    name: Optional[str] = None
    display_order: Optional[int] = None
    body_type_id: Optional[str] = None
    width_inches: Optional[int] = None
    width_mm: Optional[int] = None
    height_inches: Optional[int] = None
    height_mm: Optional[int] = None
    default_packaging_per_box: Optional[int] = None
    application_type_id: Optional[str] = None


class SizeCreateRequest(BaseModel):
    width_inches: int
    width_mm: int
    height_inches: int
    height_mm: int
    default_packaging_per_box: int
    application_type_id: str
    body_type_id: str


def _propagate_size_to_subcategories_and_products(db: Session, size_obj: Size) -> None:
    linked_subcategories = db.query(SubCategory).filter(SubCategory.size_id == size_obj.id).all()
    for subcat in linked_subcategories:
        subcat.size = f"{size_obj.height_inches}x{size_obj.width_inches}"
        subcat.height_inches = size_obj.height_inches
        subcat.width_inches = size_obj.width_inches
        subcat.height_mm = size_obj.height_mm
        subcat.width_mm = size_obj.width_mm
        subcat.default_packing_per_box = size_obj.default_packaging_per_box
        subcat.coverage_per_pc_sqm = size_obj.coverage_per_pc_sqm
        subcat.coverage_per_pc_sqft = size_obj.coverage_per_pc_sqft

        products = db.query(Product).filter(Product.sub_category_id == subcat.id).all()
        for product in products:
            product.coverage_per_pc_sqm = size_obj.coverage_per_pc_sqm
            product.coverage_per_pc_sqft = size_obj.coverage_per_pc_sqft
            product.coverage_per_box_sqm = float(size_obj.coverage_per_pc_sqm) * float(product.packing_per_box)
            product.coverage_per_box_sqft = float(size_obj.coverage_per_pc_sqft) * float(product.packing_per_box)

@admin_router.get("/reference-data/summary")
async def get_reference_data_summary(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get counts of all reference data types (only active items)"""
    
    return {
        "categories": db.query(Category).filter(Category.is_active == True).count(),
        "sub_categories": db.query(SubCategory).count(),
        "body_types": db.query(BodyType).filter(BodyType.is_active == True).count(),
        "make_types": db.query(MakeType).filter(MakeType.is_active == True).count(),
        "surface_types": db.query(SurfaceType).filter(SurfaceType.is_active == True).count(),
        "application_types": db.query(ApplicationType).filter(ApplicationType.is_active == True).count(),
        "quality_types": db.query(Quality).filter(Quality.is_active == True).count(),
        "sizes": db.query(Size).filter(Size.is_active == True).count(),
        "products": db.query(Product).count()
    }

@admin_router.get("/reference-data/{data_type}")
async def get_reference_data_list(
    data_type: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get list of reference data items by type"""
    
    type_map = {
        "body_types": BodyType,
        "make_types": MakeType,
        "surface_types": SurfaceType,
        "application_types": ApplicationType,
        "quality_types": Quality,
        "sizes": Size,
        "categories": Category
    }
    
    if data_type not in type_map:
        raise HTTPException(status_code=400, detail="Invalid data type")
    
    model = type_map[data_type]
    items = db.query(model).filter(model.is_active == True).order_by(model.display_order).all()
    
    # Special handling for make_types to include body_type info
    if data_type == "make_types":
        return [
            {
                "id": str(item.id),
                "name": item.name,
                "display_order": item.display_order,
                "is_active": item.is_active,
                "created_at": item.created_at,
                "body_type_id": str(item.body_type_id) if item.body_type_id else None,
                "body_type_name": db.query(BodyType).filter(BodyType.id == item.body_type_id).first().name if item.body_type_id else None
            }
            for item in items
        ]
    
    return [
        {
            "id": str(item.id),
            "name": item.name,
            "display_order": item.display_order,
            "is_active": item.is_active,
            "created_at": item.created_at
        }
        for item in items
    ]

@admin_router.post("/reference-data/{data_type}")
async def create_reference_data_item(
    data_type: str,
    item: ReferenceDataItem,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new reference data item"""
    
    type_map = {
        "body_types": BodyType,
        "make_types": MakeType,
        "surface_types": SurfaceType,
        "application_types": ApplicationType,
        "quality_types": Quality,
        "sizes": Size
    }
    
    if data_type not in type_map:
        raise HTTPException(status_code=400, detail="Invalid data type")
    
    model = type_map[data_type]
    cleaned_name = (item.name or "").strip()
    if not cleaned_name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")

    # Case-insensitive duplicate check (active or inactive).
    existing = db.query(model).filter(func.lower(model.name) == cleaned_name.lower()).first()
    
    if existing:
        if existing.is_active:
            # Already exists and active
            raise HTTPException(status_code=400, detail=f"{cleaned_name} already exists and is active")
        else:
            # Exists but inactive - reactivate it
            existing.is_active = True
            existing.name = cleaned_name
            if data_type == "make_types" and item.body_type_id:
                existing.body_type_id = item.body_type_id
            existing.display_order = item.display_order
            db.commit()
            db.refresh(existing)
            
            return {
                "message": f"{cleaned_name} reactivated successfully",
                "id": str(existing.id)
            }
    
    # Special handling for make_types - requires body_type_id
    if data_type == "make_types":
        if not item.body_type_id:
            raise HTTPException(status_code=400, detail="body_type_id is required for make types")
        
        # Verify body_type exists
        body_type = db.query(BodyType).filter(BodyType.id == item.body_type_id).first()
        if not body_type:
            raise HTTPException(status_code=400, detail="Invalid body_type_id")
        
        new_item = model(
            name=cleaned_name,
            body_type_id=item.body_type_id,
            display_order=item.display_order,
            is_active=True
        )
    else:
        new_item = model(
            name=cleaned_name,
            display_order=item.display_order,
            is_active=True
        )
    
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    
    return {
        "message": f"{cleaned_name} created successfully",
        "id": str(new_item.id)
    }

@admin_router.delete("/reference-data/{data_type}/{item_id}")
async def delete_reference_data_item(
    data_type: str,
    item_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Soft delete a reference data item"""
    
    type_map = {
        "body_types": BodyType,
        "make_types": MakeType,
        "surface_types": SurfaceType,
        "application_types": ApplicationType,
        "quality_types": Quality,
        "sizes": Size
    }
    
    if data_type not in type_map:
        raise HTTPException(status_code=400, detail="Invalid data type")
    
    model = type_map[data_type]
    item = db.query(model).filter(model.id == item_id).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    item.is_active = False
    db.commit()
    
    return {"message": "Item deactivated successfully"}


@admin_router.put("/reference-data/{data_type}/{item_id}")
async def update_reference_data_item(
    data_type: str,
    item_id: str,
    payload: ReferenceDataUpdateRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update an existing reference data item."""
    type_map = {
        "body_types": BodyType,
        "make_types": MakeType,
        "surface_types": SurfaceType,
        "application_types": ApplicationType,
        "quality_types": Quality,
        "sizes": Size,
        "categories": Category
    }

    if data_type not in type_map:
        raise HTTPException(status_code=400, detail="Invalid data type")

    model = type_map[data_type]
    item = db.query(model).filter(model.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if payload.display_order is not None:
        item.display_order = payload.display_order

    if data_type == "sizes":
        width_inches = payload.width_inches if payload.width_inches is not None else item.width_inches
        width_mm = payload.width_mm if payload.width_mm is not None else item.width_mm
        height_inches = payload.height_inches if payload.height_inches is not None else item.height_inches
        height_mm = payload.height_mm if payload.height_mm is not None else item.height_mm
        packaging = payload.default_packaging_per_box if payload.default_packaging_per_box is not None else item.default_packaging_per_box

        if width_inches <= 0 or width_mm <= 0 or height_inches <= 0 or height_mm <= 0 or packaging <= 0:
            raise HTTPException(status_code=400, detail="Size values and packaging must be greater than 0")

        if payload.application_type_id is not None:
            app_type = db.query(ApplicationType).filter(ApplicationType.id == payload.application_type_id).first()
            if not app_type:
                raise HTTPException(status_code=400, detail="Invalid application_type_id")
            item.application_type_id = payload.application_type_id

        if payload.body_type_id is not None:
            body_type = db.query(BodyType).filter(BodyType.id == payload.body_type_id).first()
            if not body_type:
                raise HTTPException(status_code=400, detail="Invalid body_type_id")
            item.body_type_id = payload.body_type_id

        item.width_inches = width_inches
        item.width_mm = width_mm
        item.height_inches = height_inches
        item.height_mm = height_mm
        item.default_packaging_per_box = packaging
        cov_sqm, cov_sqft = _coverage_per_pc_from_mm(width_mm, height_mm)
        item.coverage_per_pc_sqm = cov_sqm
        item.coverage_per_pc_sqft = cov_sqft
        item.name = f"{width_inches} x {height_inches}"
        item.name_mm = f"{width_mm} x {height_mm}"
        _propagate_size_to_subcategories_and_products(db, item)
    else:
        if payload.name is not None:
            cleaned_name = payload.name.strip()
            if not cleaned_name:
                raise HTTPException(status_code=400, detail="Name cannot be empty")

            duplicate = db.query(model).filter(
                func.lower(model.name) == cleaned_name.lower(),
                model.id != item.id
            ).first()
            if duplicate:
                raise HTTPException(status_code=400, detail=f"{cleaned_name} already exists")
            item.name = cleaned_name

        if data_type == "make_types" and payload.body_type_id is not None:
            body_type = db.query(BodyType).filter(BodyType.id == payload.body_type_id).first()
            if not body_type:
                raise HTTPException(status_code=400, detail="Invalid body_type_id")
            item.body_type_id = payload.body_type_id

    db.commit()
    db.refresh(item)

    return {
        "message": "Item updated successfully",
        "id": str(item.id)
    }

# =====================================================
# Size Management Routes (Special handling)
# =====================================================

@admin_router.post("/reference-data/sizes/create")
async def create_size(
    size_data: SizeCreateRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new size with all parameters"""
    
    # Validate application_type exists
    app_type = db.query(ApplicationType).filter(ApplicationType.id == size_data.application_type_id).first()
    if not app_type:
        raise HTTPException(status_code=400, detail="Invalid application_type_id")
    
    # Validate body_type exists
    body_type = db.query(BodyType).filter(BodyType.id == size_data.body_type_id).first()
    if not body_type:
        raise HTTPException(status_code=400, detail="Invalid body_type_id")
    
    # Generate names
    name_inches = f"{size_data.width_inches} x {size_data.height_inches}"
    name_mm = f"{size_data.width_mm} x {size_data.height_mm}"
    coverage_per_pc_sqm, coverage_per_pc_sqft = _coverage_per_pc_from_mm(size_data.width_mm, size_data.height_mm)
    
    # Check if size with same name already exists (active or inactive)
    existing = db.query(Size).filter(Size.name == name_inches).first()
    
    if existing:
        if existing.is_active:
            raise HTTPException(status_code=400, detail=f"Size '{name_inches}' already exists and is active")
        else:
            # Reactivate the existing inactive size
            existing.is_active = True
            existing.name_mm = name_mm
            existing.width_inches = size_data.width_inches
            existing.width_mm = size_data.width_mm
            existing.height_inches = size_data.height_inches
            existing.height_mm = size_data.height_mm
            existing.default_packaging_per_box = size_data.default_packaging_per_box
            existing.application_type_id = size_data.application_type_id
            existing.body_type_id = size_data.body_type_id
            existing.coverage_per_pc_sqm = coverage_per_pc_sqm
            existing.coverage_per_pc_sqft = coverage_per_pc_sqft
            _propagate_size_to_subcategories_and_products(db, existing)
            db.commit()
            db.refresh(existing)
            return {
                "message": f"Size '{name_inches}' reactivated successfully",
                "id": str(existing.id),
                "name_inches": name_inches,
                "name_mm": name_mm
            }
    
    # Create new size
    new_size = Size(
        name=name_inches,
        name_mm=name_mm,
        width_inches=size_data.width_inches,
        width_mm=size_data.width_mm,
        height_inches=size_data.height_inches,
        height_mm=size_data.height_mm,
        default_packaging_per_box=size_data.default_packaging_per_box,
        coverage_per_pc_sqm=coverage_per_pc_sqm,
        coverage_per_pc_sqft=coverage_per_pc_sqft,
        application_type_id=size_data.application_type_id,
        body_type_id=size_data.body_type_id,
        is_active=True
    )
    
    try:
        db.add(new_size)
        db.commit()
        db.refresh(new_size)
        
        return {
            "message": f"Size '{name_inches}' created successfully",
            "id": str(new_size.id),
            "name_inches": name_inches,
            "name_mm": name_mm,
            "coverage_per_pc_sqm": coverage_per_pc_sqm,
            "coverage_per_pc_sqft": coverage_per_pc_sqft
        }
    except Exception as e:
        db.rollback()
        # Handle any database constraint violations
        if "duplicate key" in str(e).lower() or "unique constraint" in str(e).lower():
            raise HTTPException(status_code=400, detail=f"Size '{name_inches}' already exists in the database")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@admin_router.get("/reference-data/sizes/detailed")
async def get_sizes_detailed(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all sizes with full details including related data"""
    
    sizes = db.query(Size).filter(Size.is_active == True).order_by(Size.display_order).all()
    
    result = []
    for size in sizes:
        app_type = db.query(ApplicationType).filter(ApplicationType.id == size.application_type_id).first()
        body_type = db.query(BodyType).filter(BodyType.id == size.body_type_id).first()
        
        result.append({
            "id": str(size.id),
            "name": size.name,
            "name_mm": size.name_mm,
            "width_inches": size.width_inches,
            "width_mm": size.width_mm,
            "height_inches": size.height_inches,
            "height_mm": size.height_mm,
            "default_packaging_per_box": size.default_packaging_per_box,
            "coverage_per_pc_sqm": size.coverage_per_pc_sqm,
            "coverage_per_pc_sqft": size.coverage_per_pc_sqft,
            "application_type_id": str(size.application_type_id) if size.application_type_id else None,
            "application_type_name": app_type.name if app_type else None,
            "body_type_id": str(size.body_type_id) if size.body_type_id else None,
            "body_type_name": body_type.name if body_type else None,
            "created_at": size.created_at
        })
    
    return result


# =====================================================
# Data Integrity Audit Routes
# =====================================================

@admin_router.get("/data-integrity/team-linkage")
async def audit_team_member_linkage(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
    limit: int = 200,
):
    """
    Audit team-member linkage rules.

    Rule:
    - Every user with user_type in ['staff', 'manager'] must have a valid merchant_id.
    """
    limit = max(1, min(limit, 1000))

    team_members = db.query(User).filter(
        User.user_type.in_(["staff", "manager"]),
        User.deleted_at.is_(None),
    ).all()

    merchants = db.query(Merchant.id).filter(Merchant.deleted_at.is_(None)).all()
    active_merchant_ids = {str(row[0]) for row in merchants}

    missing_merchant = []
    invalid_merchant = []
    healthy_count = 0

    for user in team_members:
        if not user.merchant_id:
            missing_merchant.append(user)
            continue
        if str(user.merchant_id) not in active_merchant_ids:
            invalid_merchant.append(user)
            continue
        healthy_count += 1

    def to_payload(users: list[User]):
        return [
            {
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
                "user_type": user.user_type,
                "merchant_id": str(user.merchant_id) if user.merchant_id else None,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            }
            for user in users[:limit]
        ]

    return {
        "summary": {
            "total_team_members": len(team_members),
            "healthy_linked_members": healthy_count,
            "missing_merchant_count": len(missing_merchant),
            "invalid_merchant_reference_count": len(invalid_merchant),
            "is_compliant": len(missing_merchant) == 0 and len(invalid_merchant) == 0,
        },
        "violations": {
            "missing_merchant": to_payload(missing_merchant),
            "invalid_merchant_reference": to_payload(invalid_merchant),
        },
    }
