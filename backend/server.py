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
    SurfaceType, ApplicationType, BodyType, Quality, Category, Size, ProductTransaction, ProductActivityLog, ProductImage
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
    
    # Total inventory value - NOTE: Price not implemented yet
    inventory_value = 0  # Will be calculated once pricing is added
    
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

@api_router.get("/dealer/subcategories/{subcategory_id}/products")
async def get_products_in_subcategory(
    subcategory_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all products in a sub-category for this merchant"""
    if current_user.user_type != "dealer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dealers can access this endpoint"
        )
    
    # Get sub-category info
    subcat = db.query(SubCategory).filter(SubCategory.id == subcategory_id).first()
    if not subcat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sub-category not found"
        )
    
    # Get make type
    make_type = db.query(MakeType).filter(MakeType.id == subcat.make_type_id).first()
    
    # Get products for this merchant in this sub-category
    products = db.query(Product).filter(
        Product.sub_category_id == subcategory_id,
        Product.merchant_id == current_user.merchant_id,
        Product.is_active == True
    ).all()
    
    product_list = []
    for product in products:
        # Get reference data names
        surface_type = db.query(SurfaceType).filter(SurfaceType.id == product.surface_type_id).first()
        application_type = db.query(ApplicationType).filter(ApplicationType.id == product.application_type_id).first()
        body_type = db.query(BodyType).filter(BodyType.id == product.body_type_id).first()
        quality = db.query(Quality).filter(Quality.id == product.quality_id).first()
        
        product_list.append({
            "id": str(product.id),
            "brand": product.brand,
            "name": product.name,
            "sku": product.sku,
            "surface_type": surface_type.name if surface_type else "",
            "application_type": application_type.name if application_type else "",
            "body_type": body_type.name if body_type else "",
            "quality": quality.name if quality else "",
            "current_quantity": product.current_quantity,
            "packing_per_box": product.packing_per_box,
            "primary_image_url": product.primary_image_url
        })
    
    return {
        "subcategory": {
            "id": str(subcat.id),
            "name": subcat.name,
            "size": subcat.size,
            "size_display": f"{subcat.height_inches}\" x {subcat.width_inches}\"",
            "size_mm": f"{subcat.height_mm}mm x {subcat.width_mm}mm",
            "make_type": make_type.name if make_type else ""
        },
        "products": product_list
    }

@api_router.post("/dealer/products")
async def create_product(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new product"""
    if current_user.user_type != "dealer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dealers can access this endpoint"
        )
    
    # Validate required fields
    required_fields = ['sub_category_id', 'brand', 'name', 'surface_type_id', 
                       'application_type_id', 'body_type_id', 'quality_id',
                       'current_quantity', 'packing_per_box']
    
    for field in required_fields:
        if field not in request or request[field] is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Field '{field}' is required"
            )
    
    # Check for duplicate product name within same sub-category for this merchant
    existing = db.query(Product).filter(
        Product.merchant_id == current_user.merchant_id,
        Product.sub_category_id == request['sub_category_id'],
        Product.brand == request['brand'],
        Product.name == request['name']
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product '{request['brand']} {request['name']}' already exists in this category"
        )
    
    # Create product
    new_product = Product(
        merchant_id=current_user.merchant_id,
        sub_category_id=request['sub_category_id'],
        brand=request['brand'],
        name=request['name'],
        sku=request.get('sku'),
        surface_type_id=request['surface_type_id'],
        application_type_id=request['application_type_id'],
        body_type_id=request['body_type_id'],
        quality_id=request['quality_id'],
        current_quantity=request['current_quantity'],
        packing_per_box=request['packing_per_box'],
        primary_image_url=request.get('primary_image_url'),
        is_active=True
    )
    
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    
    # Log product creation activity
    log_product_activity(
        db=db,
        product_id=str(new_product.id),
        merchant_id=str(current_user.merchant_id),
        user_id=str(current_user.id),
        activity_type='created',
        description=f"Product created: {new_product.brand} {new_product.name}"
    )
    db.commit()
    
    return {
        "message": f"Product '{request['brand']} {request['name']}' created successfully",
        "product": {
            "id": str(new_product.id),
            "brand": new_product.brand,
            "name": new_product.name,
            "quantity": new_product.current_quantity
        }
    }

@api_router.get("/dealer/products/{product_id}")
async def get_product_detail(
    product_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific product"""
    if current_user.user_type != "dealer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dealers can access this endpoint"
        )
    
    # Get product with all related data
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.merchant_id == current_user.merchant_id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Get related entities
    sub_category = db.query(SubCategory).filter(SubCategory.id == product.sub_category_id).first()
    surface_type = db.query(SurfaceType).filter(SurfaceType.id == product.surface_type_id).first()
    application_type = db.query(ApplicationType).filter(ApplicationType.id == product.application_type_id).first()
    body_type = db.query(BodyType).filter(BodyType.id == product.body_type_id).first()
    quality = db.query(Quality).filter(Quality.id == product.quality_id).first()
    
    return {
        "product": {
            "id": str(product.id),
            "sub_category_id": str(product.sub_category_id),
            "sub_category_name": sub_category.name if sub_category else "",
            "brand": product.brand,
            "name": product.name,
            "sku": product.sku,
            "surface_type_id": str(product.surface_type_id),
            "surface_type": surface_type.name if surface_type else "",
            "application_type_id": str(product.application_type_id),
            "application_type": application_type.name if application_type else "",
            "body_type_id": str(product.body_type_id),
            "body_type": body_type.name if body_type else "",
            "quality_id": str(product.quality_id),
            "quality": quality.name if quality else "",
            "current_quantity": product.current_quantity,
            "packing_per_box": product.packing_per_box,
            "primary_image_url": product.primary_image_url,
            "is_active": product.is_active,
            "created_at": product.created_at.isoformat() if product.created_at else None,
            "updated_at": product.updated_at.isoformat() if product.updated_at else None
        }
    }

@api_router.put("/dealer/products/{product_id}")
async def update_product(
    product_id: str,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing product"""
    if current_user.user_type != "dealer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dealers can access this endpoint"
        )
    
    # Get product
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.merchant_id == current_user.merchant_id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Track changes for activity log
    changes_made = []
    
    # Helper function to get name from ID
    def get_name_by_id(model, id_value):
        if not id_value:
            return None
        obj = db.query(model).filter(model.id == id_value).first()
        return obj.name if obj else str(id_value)
    
    # Update fields and track changes with human-readable names
    if 'brand' in request and request['brand'] != product.brand:
        changes_made.append({"field": "brand", "old_value": product.brand, "new_value": request['brand']})
        product.brand = request['brand']
    
    if 'name' in request and request['name'] != product.name:
        changes_made.append({"field": "name", "old_value": product.name, "new_value": request['name']})
        product.name = request['name']
    
    if 'sku' in request and request['sku'] != product.sku:
        changes_made.append({"field": "sku", "old_value": product.sku or "Not set", "new_value": request['sku'] or "Not set"})
        product.sku = request['sku']
    
    if 'surface_type_id' in request and request['surface_type_id'] != str(product.surface_type_id):
        old_name = get_name_by_id(SurfaceType, product.surface_type_id)
        new_name = get_name_by_id(SurfaceType, request['surface_type_id'])
        changes_made.append({"field": "surface_type", "old_value": old_name, "new_value": new_name})
        product.surface_type_id = request['surface_type_id']
    
    if 'application_type_id' in request and request['application_type_id'] != str(product.application_type_id):
        old_name = get_name_by_id(ApplicationType, product.application_type_id)
        new_name = get_name_by_id(ApplicationType, request['application_type_id'])
        changes_made.append({"field": "application_type", "old_value": old_name, "new_value": new_name})
        product.application_type_id = request['application_type_id']
    
    if 'body_type_id' in request and request['body_type_id'] != str(product.body_type_id):
        old_name = get_name_by_id(BodyType, product.body_type_id)
        new_name = get_name_by_id(BodyType, request['body_type_id'])
        changes_made.append({"field": "body_type", "old_value": old_name, "new_value": new_name})
        product.body_type_id = request['body_type_id']
    
    if 'quality_id' in request and request['quality_id'] != str(product.quality_id):
        old_name = get_name_by_id(Quality, product.quality_id)
        new_name = get_name_by_id(Quality, request['quality_id'])
        changes_made.append({"field": "quality", "old_value": old_name, "new_value": new_name})
        product.quality_id = request['quality_id']
    
    if 'packing_per_box' in request and request['packing_per_box'] != product.packing_per_box:
        changes_made.append({"field": "packing_per_box", "old_value": f"{product.packing_per_box} pieces", "new_value": f"{request['packing_per_box']} pieces"})
        product.packing_per_box = request['packing_per_box']
    
    # Update timestamp
    from datetime import datetime, timezone
    product.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(product)
    
    # Log activity if changes were made
    if changes_made:
        log_product_activity(
            db=db,
            product_id=str(product.id),
            merchant_id=str(current_user.merchant_id),
            user_id=str(current_user.id),
            activity_type='edited',
            changes={"fields_changed": changes_made},
            description=f"Product edited: {len(changes_made)} field(s) updated"
        )
        db.commit()
    
    return {
        "message": "Product updated successfully",
        "product": {
            "id": str(product.id),
            "brand": product.brand,
            "name": product.name,
            "current_quantity": product.current_quantity
        }
    }

@api_router.delete("/dealer/products/{product_id}")
async def delete_product(
    product_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a product (soft delete by setting is_active to False)"""
    if current_user.user_type != "dealer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dealers can access this endpoint"
        )
    
    # Get product
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.merchant_id == current_user.merchant_id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Soft delete
    product.is_active = False
    from datetime import datetime, timezone
    product.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    
    # Log deletion activity
    log_product_activity(
        db=db,
        product_id=str(product.id),
        merchant_id=str(current_user.merchant_id),
        user_id=str(current_user.id),
        activity_type='deleted',
        description=f"Product deleted: {product.brand} {product.name}"
    )
    db.commit()
    
    return {
        "message": f"Product '{product.brand} {product.name}' deleted successfully"
    }

# Product Transactions Routes
@api_router.post("/dealer/products/{product_id}/transactions")
async def create_product_transaction(
    product_id: str,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new product transaction (add or subtract quantity)"""
    if current_user.user_type != "dealer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dealers can access this endpoint"
        )
    
    # Validate request
    transaction_type = request.get('transaction_type')
    quantity = request.get('quantity')
    
    if not transaction_type or transaction_type not in ['add', 'subtract']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="transaction_type must be 'add' or 'subtract'"
        )
    
    if not quantity or not isinstance(quantity, int) or quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="quantity must be a positive integer"
        )
    
    # Get product
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.merchant_id == current_user.merchant_id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Calculate new quantity
    quantity_before = product.current_quantity
    if transaction_type == 'add':
        quantity_after = quantity_before + quantity
    else:  # subtract
        quantity_after = quantity_before - quantity
    
    # Create transaction record
    transaction = ProductTransaction(
        product_id=product.id,
        merchant_id=current_user.merchant_id,
        user_id=current_user.id,
        transaction_type=transaction_type,
        quantity=quantity,
        quantity_before=quantity_before,
        quantity_after=quantity_after,
        notes=request.get('notes')
    )
    
    # Update product quantity
    product.current_quantity = quantity_after
    
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    db.refresh(product)
    
    # Log activity
    log_product_activity(
        db=db,
        product_id=str(product.id),
        merchant_id=str(current_user.merchant_id),
        user_id=str(current_user.id),
        activity_type='quantity_add' if transaction_type == 'add' else 'quantity_subtract',
        changes={"quantity_change": quantity if transaction_type == 'add' else -quantity, "from": quantity_before, "to": quantity_after},
        description=f"{transaction_type.capitalize()} {quantity} boxes: {quantity_before} → {quantity_after}"
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
            "created_at": transaction.created_at.isoformat()
        },
        "product": {
            "id": str(product.id),
            "current_quantity": product.current_quantity
        }
    }

@api_router.get("/dealer/products/{product_id}/transactions")
async def get_product_transactions(
    product_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50
):
    """Get transaction history for a product"""
    if current_user.user_type != "dealer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dealers can access this endpoint"
        )
    
    # Verify product belongs to merchant
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.merchant_id == current_user.merchant_id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Get transactions
    transactions = db.query(ProductTransaction).filter(
        ProductTransaction.product_id == product_id
    ).order_by(ProductTransaction.created_at.desc()).limit(limit).all()
    
    transaction_list = []
    for txn in transactions:
        # Get user who made the transaction
        user = db.query(User).filter(User.id == txn.user_id).first()
        
        transaction_list.append({
            "id": str(txn.id),
            "transaction_type": txn.transaction_type,
            "quantity": txn.quantity,
            "quantity_before": txn.quantity_before,
            "quantity_after": txn.quantity_after,
            "notes": txn.notes,
            "created_at": txn.created_at.isoformat(),
            "created_by": user.username if user else "Unknown"
        })
    
    return {
        "product": {
            "id": str(product.id),
            "brand": product.brand,
            "name": product.name,
            "current_quantity": product.current_quantity
        },
        "transactions": transaction_list,
        "total_count": len(transaction_list)
    }

@api_router.get("/dealer/products/{product_id}/activity-log")
async def get_product_activity_log(
    product_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 100
):
    """Get complete activity log for a product (all changes)"""
    if current_user.user_type != "dealer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dealers can access this endpoint"
        )
    
    # Verify product belongs to merchant
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.merchant_id == current_user.merchant_id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Get activity log
    activities = db.query(ProductActivityLog).filter(
        ProductActivityLog.product_id == product_id
    ).order_by(ProductActivityLog.created_at.desc()).limit(limit).all()
    
    activity_list = []
    for activity in activities:
        # Get user who performed the action
        user = db.query(User).filter(User.id == activity.user_id).first()
        
        activity_list.append({
            "id": str(activity.id),
            "activity_type": activity.activity_type,
            "changes": activity.changes,
            "description": activity.description,
            "created_at": activity.created_at.isoformat(),
            "created_by": user.username if user else "Unknown"
        })
    
    return {
        "product": {
            "id": str(product.id),
            "brand": product.brand,
            "name": product.name,
            "current_quantity": product.current_quantity
        },
        "activities": activity_list,
        "total_count": len(activity_list)
    }


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
async def get_tile_sizes(db: Session = Depends(get_db)):
    """Get tile sizes from database (admin-managed)"""
    sizes = db.query(Size).filter(Size.is_active == True).order_by(Size.display_order).all()
    return {
        "sizes": [
            {
                "value": size.name,
                "label": f"{size.name} ({size.height_mm}x{size.width_mm}mm)",
                "height_inches": size.height_inches,
                "width_inches": size.width_inches,
                "height_mm": size.height_mm,
                "width_mm": size.width_mm
            }
            for size in sizes
        ]
    }

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

# Universal Search Route
@api_router.get("/dealer/search")
async def universal_search(
    q: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Universal search across sub-categories and products"""
    if current_user.user_type != "dealer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dealers can access this endpoint"
        )
    
    if not q or len(q.strip()) < 2:
        return {
            "subcategories": [],
            "products": [],
            "total_results": 0
        }
    
    query = q.lower().strip()
    
    # Search sub-categories
    tiles_category = db.query(Category).filter(Category.slug == "tiles").first()
    subcategories_results = []
    
    if tiles_category:
        subcats = db.query(SubCategory).filter(
            SubCategory.category_id == tiles_category.id,
            SubCategory.is_active == True
        ).all()
        
        for subcat in subcats:
            make_type = db.query(MakeType).filter(MakeType.id == subcat.make_type_id).first()
            
            # Check if query matches
            if (query in subcat.name.lower() or 
                query in subcat.size.lower() or
                query in f"{subcat.height_mm}".lower() or
                query in f"{subcat.width_mm}".lower() or
                (make_type and query in make_type.name.lower())):
                
                # Count products for this merchant
                product_count = db.query(func.count(Product.id)).filter(
                    Product.sub_category_id == subcat.id,
                    Product.merchant_id == current_user.merchant_id,
                    Product.is_active == True
                ).scalar()
                
                subcategories_results.append({
                    "id": str(subcat.id),
                    "name": subcat.name,
                    "size": subcat.size,
                    "size_display": f"{subcat.height_inches}\" x {subcat.width_inches}\"",
                    "make_type": make_type.name if make_type else "",
                    "product_count": product_count or 0,
                    "type": "subcategory"
                })
    
    # Search products (only this merchant's products)
    products = db.query(Product).filter(
        Product.merchant_id == current_user.merchant_id,
        Product.is_active == True
    ).all()
    
    products_results = []
    for product in products:
        # Get related data
        surface_type = db.query(SurfaceType).filter(SurfaceType.id == product.surface_type_id).first()
        quality = db.query(Quality).filter(Quality.id == product.quality_id).first()
        subcat = db.query(SubCategory).filter(SubCategory.id == product.sub_category_id).first()
        
        # Check if query matches
        if (query in product.brand.lower() or
            query in product.name.lower() or
            (product.sku and query in product.sku.lower()) or
            (surface_type and query in surface_type.name.lower()) or
            (quality and query in quality.name.lower())):
            
            products_results.append({
                "id": str(product.id),
                "brand": product.brand,
                "name": product.name,
                "sku": product.sku,
                "surface_type": surface_type.name if surface_type else "",
                "quality": quality.name if quality else "",
                "current_quantity": product.current_quantity,
                "subcategory_id": str(product.sub_category_id),
                "subcategory_name": subcat.name if subcat else "",
                "type": "product"
            })
    
    return {
        "subcategories": subcategories_results[:10],  # Limit to 10
        "products": products_results[:10],  # Limit to 10
        "total_results": len(subcategories_results) + len(products_results)
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

# Helper function to log product activities
def log_product_activity(
    db: Session,
    product_id: str,
    merchant_id: str,
    user_id: str,
    activity_type: str,
    changes: dict = None,
    description: str = None
):
    """Log product activity for audit trail"""
    activity = ProductActivityLog(
        product_id=product_id,
        merchant_id=merchant_id,
        user_id=user_id,
        activity_type=activity_type,
        changes=changes,
        description=description
    )
    db.add(activity)
    # Note: Caller should commit after their main operation


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
