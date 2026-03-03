from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone, timedelta
from typing import Optional
import os
import logging
from pathlib import Path
from dotenv import load_dotenv

from database import get_db
from models import (
    User, Merchant, Product, SubCategory, MakeType, 
    SurfaceType, ApplicationType, BodyType, Quality, Category
)
from auth import get_password_hash, verify_password, create_access_token, get_current_user
from sqlalchemy import func
from typing import List

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create the main app
app = FastAPI(title="SupplySync API")

# Create API router with /api prefix
api_router = APIRouter(prefix="/api")

# Pydantic Models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

class RegisterDealerRequest(BaseModel):
    username: str
    email: EmailStr
    phone: str
    password: str
    merchant_name: str
    merchant_email: Optional[str] = None
    merchant_phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    gst_number: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    user_type: str
    merchant_id: Optional[str] = None
    preferred_language: str

# Auth Routes
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login endpoint for dealers and subdealers"""
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    
    # Update last login
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "user_type": user.user_type,
            "merchant_id": str(user.merchant_id) if user.merchant_id else None,
            "preferred_language": user.preferred_language
        }
    }

@api_router.post("/auth/register/dealer")
async def register_dealer(request: RegisterDealerRequest, db: Session = Depends(get_db)):
    """Register a new dealer account"""
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username already exists
    existing_username = db.query(User).filter(User.username == request.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create merchant first
    merchant = Merchant(
        name=request.merchant_name,
        email=request.merchant_email,
        phone=request.merchant_phone,
        address=request.address,
        city=request.city,
        state=request.state,
        gst_number=request.gst_number
    )
    db.add(merchant)
    db.flush()
    
    # Create user
    hashed_password = get_password_hash(request.password)
    user = User(
        username=request.username,
        email=request.email,
        phone=request.phone,
        password_hash=hashed_password,
        user_type="dealer",
        merchant_id=merchant.id,
        role="admin",
        is_verified=True,  # Auto-verify for dealers
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "user_type": user.user_type,
            "merchant_id": str(user.merchant_id)
        }
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return {
        "id": str(current_user.id),
        "username": current_user.username,
        "email": current_user.email,
        "user_type": current_user.user_type,
        "merchant_id": str(current_user.merchant_id) if current_user.merchant_id else None,
        "preferred_language": current_user.preferred_language
    }

# Dashboard Routes
@api_router.get("/dealer/dashboard/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics for dealer"""
    if current_user.user_type != "dealer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dealers can access this endpoint"
        )
    
    merchant_id = current_user.merchant_id
    
    # Total products
    total_products = db.query(func.count(Product.id)).filter(
        Product.merchant_id == merchant_id
    ).scalar()
    
    # Active products
    active_products = db.query(func.count(Product.id)).filter(
        Product.merchant_id == merchant_id,
        Product.is_active == True
    ).scalar()
    
    # Low stock items (quantity < 20)
    low_stock = db.query(func.count(Product.id)).filter(
        Product.merchant_id == merchant_id,
        Product.current_quantity < 20,
        Product.current_quantity > 0
    ).scalar()
    
    # Out of stock items
    out_of_stock = db.query(func.count(Product.id)).filter(
        Product.merchant_id == merchant_id,
        Product.current_quantity == 0
    ).scalar()
    
    # Total inventory value (sum of price * quantity)
    inventory_value = db.query(
        func.sum(Product.current_price * Product.current_quantity)
    ).filter(
        Product.merchant_id == merchant_id
    ).scalar() or 0
    
    return {
        "total_products": total_products or 0,
        "active_products": active_products or 0,
        "low_stock_items": low_stock or 0,
        "out_of_stock_items": out_of_stock or 0,
        "inventory_value": float(inventory_value),
        "recent_activity": []
    }

# Sub-Categories Routes
@api_router.get("/dealer/subcategories")
async def get_subcategories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all sub-categories with product counts"""
    if current_user.user_type != "dealer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dealers can access this endpoint"
        )
    
    # Get tiles category
    tiles_category = db.query(Category).filter(Category.slug == "tiles").first()
    if not tiles_category:
        return {"subcategories": []}
    
    # Get all sub-categories with stats
    subcategories = db.query(SubCategory).filter(
        SubCategory.category_id == tiles_category.id,
        SubCategory.is_active == True
    ).all()
    
    result = []
    for subcat in subcategories:
        # Get make type name
        make_type = db.query(MakeType).filter(MakeType.id == subcat.make_type_id).first()
        
        # Count products in this sub-category (for this merchant)
        product_count = db.query(func.count(Product.id)).filter(
            Product.sub_category_id == subcat.id,
            Product.merchant_id == current_user.merchant_id,
            Product.is_active == True
        ).scalar()
        
        # Total quantity across all products
        total_quantity = db.query(func.sum(Product.current_quantity)).filter(
            Product.sub_category_id == subcat.id,
            Product.merchant_id == current_user.merchant_id,
            Product.is_active == True
        ).scalar() or 0
        
        result.append({
            "id": str(subcat.id),
            "name": subcat.name,
            "size": subcat.size,
            "size_display": f"{subcat.height_inches}\" x {subcat.width_inches}\"",
            "size_mm": f"{subcat.height_mm}mm x {subcat.width_mm}mm",
            "make_type": make_type.name if make_type else "",
            "product_count": product_count or 0,
            "total_quantity": int(total_quantity)
        })
    
    # Sort by name
    result.sort(key=lambda x: x['name'])
    
    return {"subcategories": result}

@api_router.post("/dealer/subcategories")
async def create_subcategory(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or get existing sub-category (smart checking)"""
    if current_user.user_type != "dealer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dealers can access this endpoint"
        )
    
    size = request.get('size')
    make_type_id = request.get('make_type_id')
    
    if not size or not make_type_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Size and make_type_id are required"
        )
    
    # Get tiles category
    tiles_category = db.query(Category).filter(Category.slug == "tiles").first()
    if not tiles_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tiles category not found"
        )
    
    # Get make type
    make_type = db.query(MakeType).filter(MakeType.id == make_type_id).first()
    if not make_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Make type not found"
        )
    
    # Parse size (e.g., "12x12" -> height=12, width=12)
    try:
        parts = size.lower().replace('"', '').replace(' ', '').split('x')
        height_inches = int(parts[0])
        width_inches = int(parts[1])
        height_mm = int(height_inches * 25.4)
        width_mm = int(width_inches * 25.4)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid size format. Use format like '12x12'"
        )
    
    # Check if sub-category already exists
    existing = db.query(SubCategory).filter(
        SubCategory.category_id == tiles_category.id,
        SubCategory.size == size,
        SubCategory.make_type_id == make_type_id
    ).first()
    
    if existing:
        return {
            "exists": True,
            "message": f"Sub-category '{existing.name}' already exists",
            "subcategory": {
                "id": str(existing.id),
                "name": existing.name,
                "size": existing.size,
                "make_type": make_type.name
            }
        }
    
    # Create new sub-category
    name = f"{size.upper()} {make_type.name.upper()}"
    
    new_subcat = SubCategory(
        category_id=tiles_category.id,
        name=name,
        size=size,
        height_inches=height_inches,
        width_inches=width_inches,
        height_mm=height_mm,
        width_mm=width_mm,
        make_type_id=make_type_id,
        default_packing_per_box=10
    )
    
    db.add(new_subcat)
    db.commit()
    db.refresh(new_subcat)
    
    return {
        "exists": False,
        "message": f"Sub-category '{name}' created successfully",
        "subcategory": {
            "id": str(new_subcat.id),
            "name": new_subcat.name,
            "size": new_subcat.size,
            "make_type": make_type.name
        }
    }

# Reference Data Routes
@api_router.get("/reference/tile-sizes")
async def get_tile_sizes():
    """Get common tile sizes"""
    sizes = [
        {"value": "8x12", "label": "8x12 (200x300mm)"},
        {"value": "10x10", "label": "10x10 (250x250mm)"},
        {"value": "10x15", "label": "10x15 (250x375mm)"},
        {"value": "10x20", "label": "10x20 (250x500mm)"},
        {"value": "10x24", "label": "10x24 (250x600mm)"},
        {"value": "12x12", "label": "12x12 (300x300mm)"},
        {"value": "12x18", "label": "12x18 (300x450mm)"},
        {"value": "12x24", "label": "12x24 (300x600mm)"},
        {"value": "16x16", "label": "16x16 (400x400mm)"},
        {"value": "16x24", "label": "16x24 (400x600mm)"},
        {"value": "18x18", "label": "18x18 (450x450mm)"},
        {"value": "20x20", "label": "20x20 (500x500mm)"},
        {"value": "24x24", "label": "24x24 (600x600mm)"},
        {"value": "24x48", "label": "24x48 (600x1200mm)"},
        {"value": "32x32", "label": "32x32 (800x800mm)"}
    ]
    return {"sizes": sizes}

@api_router.get("/reference/make-types")
async def get_make_types(db: Session = Depends(get_db)):
    """Get all make types"""
    make_types = db.query(MakeType).filter(MakeType.is_active == True).order_by(MakeType.display_order).all()
    return {
        "make_types": [
            {"id": str(mt.id), "name": mt.name}
            for mt in make_types
        ]
    }

@api_router.get("/reference/surface-types")
async def get_surface_types(db: Session = Depends(get_db)):
    """Get all surface types"""
    surface_types = db.query(SurfaceType).filter(SurfaceType.is_active == True).order_by(SurfaceType.display_order).all()
    return {
        "surface_types": [
            {"id": str(st.id), "name": st.name}
            for st in surface_types
        ]
    }

@api_router.get("/reference/application-types")
async def get_application_types(db: Session = Depends(get_db)):
    """Get all application types"""
    app_types = db.query(ApplicationType).filter(ApplicationType.is_active == True).order_by(ApplicationType.display_order).all()
    return {
        "application_types": [
            {"id": str(at.id), "name": at.name}
            for at in app_types
        ]
    }

@api_router.get("/reference/body-types")
async def get_body_types(db: Session = Depends(get_db)):
    """Get all body types"""
    body_types = db.query(BodyType).filter(BodyType.is_active == True).order_by(BodyType.display_order).all()
    return {
        "body_types": [
            {"id": str(bt.id), "name": bt.name}
            for bt in body_types
        ]
    }

@api_router.get("/reference/qualities")
async def get_qualities(db: Session = Depends(get_db)):
    """Get all qualities"""
    qualities = db.query(Quality).filter(Quality.is_active == True).order_by(Quality.display_order).all()
    return {
        "qualities": [
            {"id": str(q.id), "name": q.name}
            for q in qualities
        ]
    }

# Health check
@api_router.get("/")
async def root():
    return {"message": "SupplySync API is running"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
