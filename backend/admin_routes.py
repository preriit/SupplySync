"""
Admin Routes for SupplySync Platform
Handles admin authentication and management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone
from typing import List, Optional
import logging

from database import get_db
from models import User, Merchant, Product, SubCategory, Category
from auth import get_password_hash, verify_password, create_access_token, get_current_user

# Create admin router
admin_router = APIRouter(prefix="/admin", tags=["Admin"])

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
    active_subscriptions: int
    trial_subscriptions: int
    expired_subscriptions: int
    suspended_users: int

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
    
    # Find admin user by username
    admin_user = db.query(User).filter(
        and_(
            User.username == request.username,
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
        "active_subscriptions": active_subs,
        "trial_subscriptions": trial_subs,
        "expired_subscriptions": expired_subs,
        "suspended_users": suspended_users
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

from models import MakeType, ApplicationType, SurfaceType, BodyType, Quality, Size

class ReferenceDataItem(BaseModel):
    name: str
    display_order: Optional[int] = 0

@admin_router.get("/reference-data/summary")
async def get_reference_data_summary(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get counts of all reference data types"""
    
    return {
        "categories": db.query(Category).count(),
        "sub_categories": db.query(SubCategory).count(),
        "body_types": db.query(BodyType).count(),
        "make_types": db.query(MakeType).count(),
        "surface_types": db.query(SurfaceType).count(),
        "application_types": db.query(ApplicationType).count(),
        "quality_types": db.query(Quality).count(),
        "sizes": db.query(Size).count(),
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
    
    # Check for duplicate
    existing = db.query(model).filter(model.name == item.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"{item.name} already exists")
    
    new_item = model(
        name=item.name,
        display_order=item.display_order,
        is_active=True
    )
    
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    
    return {
        "message": f"{item.name} created successfully",
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
