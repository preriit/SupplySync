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
from models import User, Merchant, Product
from auth import get_password_hash, verify_password, create_access_token, get_current_user
from sqlalchemy import func

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
