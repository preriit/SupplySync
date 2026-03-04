from sqlalchemy import Column, String, Boolean, Integer, DECIMAL, Text, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import uuid

# =====================================================
# REFERENCE TABLES
# =====================================================

class BodyType(Base):
    __tablename__ = "body_types"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class MakeType(Base):
    __tablename__ = "make_types"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    body_type_id = Column(UUID(as_uuid=True), ForeignKey('body_types.id'))
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SurfaceType(Base):
    __tablename__ = "surface_types"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ApplicationType(Base):
    __tablename__ = "application_types"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Quality(Base):
    __tablename__ = "qualities"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Size(Base):
    __tablename__ = "sizes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), unique=True, nullable=False)
    height_inches = Column(Integer, nullable=False)
    width_inches = Column(Integer, nullable=False)
    height_mm = Column(Integer, nullable=False)
    width_mm = Column(Integer, nullable=False)
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# =====================================================
# MAIN TABLES
# =====================================================

class Merchant(Base):
    __tablename__ = "merchants"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255))
    phone = Column(String(20))
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100), default='India')
    postal_code = Column(String(20))
    gst_number = Column(String(20))
    pan = Column(String(20))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    extra_data = Column('metadata', JSON)

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(20), unique=True)
    password_hash = Column(String(255), nullable=False)
    user_type = Column(String(20), nullable=False)  # 'dealer' or 'subdealer'
    merchant_id = Column(UUID(as_uuid=True), ForeignKey('merchants.id'))
    role = Column(String(20))  # For dealers: 'admin', 'manager', 'viewer'
    business_name = Column(String(255))  # For subdealers
    business_address = Column(Text)  # For subdealers
    gst_number = Column(String(20))  # For subdealers
    preferred_language = Column(String(5), default='en')
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True))
    extra_data = Column('metadata', JSON)

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SubCategory(Base):
    __tablename__ = "sub_categories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id = Column(UUID(as_uuid=True), ForeignKey('categories.id'), nullable=False)
    name = Column(String(255), nullable=False)  # "12x12 GVT"
    
    # Size information
    size = Column(String(50), nullable=False)  # "12x12"
    height_inches = Column(Integer, nullable=False)
    width_inches = Column(Integer, nullable=False)
    height_mm = Column(Integer, nullable=False)
    width_mm = Column(Integer, nullable=False)
    
    # Make type
    make_type_id = Column(UUID(as_uuid=True), ForeignKey('make_types.id'), nullable=False)
    
    # Defaults
    default_packing_per_box = Column(Integer, default=10)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Product(Base):
    __tablename__ = "products"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    merchant_id = Column(UUID(as_uuid=True), ForeignKey('merchants.id'), nullable=False)
    sub_category_id = Column(UUID(as_uuid=True), ForeignKey('sub_categories.id'), nullable=False)
    
    # Product identification
    brand = Column(String(100), nullable=False)
    name = Column(String(255), nullable=False)
    sku = Column(String(100))
    
    # Tile attributes
    surface_type_id = Column(UUID(as_uuid=True), ForeignKey('surface_types.id'), nullable=False)
    application_type_id = Column(UUID(as_uuid=True), ForeignKey('application_types.id'), nullable=False)
    body_type_id = Column(UUID(as_uuid=True), ForeignKey('body_types.id'), nullable=False)
    quality_id = Column(UUID(as_uuid=True), ForeignKey('qualities.id'), nullable=False)
    
    # Stock information (NO PRICE)
    current_quantity = Column(Integer, default=0)
    packing_per_box = Column(Integer, default=10)
    
    # Images
    primary_image_url = Column(Text)
    
    # Status
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class ProductImage(Base):
    __tablename__ = "product_images"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey('products.id', ondelete='CASCADE'))
    image_url = Column(Text, nullable=False)
    is_primary = Column(Boolean, default=False)
    ordering = Column(Integer, default=0)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

class ProductTransaction(Base):
    __tablename__ = "product_transactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    merchant_id = Column(UUID(as_uuid=True), ForeignKey('merchants.id'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    # Transaction details
    transaction_type = Column(String(20), nullable=False)  # 'add' or 'subtract'
    quantity = Column(Integer, nullable=False)  # Always positive number
    quantity_before = Column(Integer, nullable=False)
    quantity_after = Column(Integer, nullable=False)
    
    # Additional context
    notes = Column(Text)
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ProductActivityLog(Base):
    __tablename__ = "product_activity_log"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    merchant_id = Column(UUID(as_uuid=True), ForeignKey('merchants.id'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    # Activity details
    activity_type = Column(String(50), nullable=False)  # 'created', 'edited', 'quantity_add', etc.
    changes = Column(JSON)  # Store changes as JSON
    description = Column(Text)
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now())
