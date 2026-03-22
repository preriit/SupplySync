"""Merchant products, images, transactions, and activity log."""

from sqlalchemy import Column, String, Boolean, Integer, Text, DateTime, ForeignKey, JSON, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from database import Base
import uuid


class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    merchant_id = Column(UUID(as_uuid=True), ForeignKey("merchants.id"), nullable=False)
    sub_category_id = Column(UUID(as_uuid=True), ForeignKey("sub_categories.id"), nullable=False)

    brand = Column(String(100), nullable=False)
    name = Column(String(255), nullable=False)
    sku = Column(String(100))

    surface_type_id = Column(UUID(as_uuid=True), ForeignKey("surface_types.id"), nullable=False)
    application_type_id = Column(UUID(as_uuid=True), ForeignKey("application_types.id"), nullable=False)
    body_type_id = Column(UUID(as_uuid=True), ForeignKey("body_types.id"), nullable=False)
    quality_id = Column(UUID(as_uuid=True), ForeignKey("qualities.id"), nullable=False)

    # Denormalized labels (filled at create/update) so list APIs skip reference joins
    surface_type_name = Column(String(120), nullable=True)
    application_type_name = Column(String(120), nullable=True)
    body_type_name = Column(String(120), nullable=True)
    quality_name = Column(String(120), nullable=True)

    current_quantity = Column(Integer, default=0)
    packing_per_box = Column(Integer, default=10)

    coverage_per_pc_sqm = Column(Float, nullable=True)
    coverage_per_pc_sqft = Column(Float, nullable=True)
    coverage_per_box_sqm = Column(Float, nullable=True)
    coverage_per_box_sqft = Column(Float, nullable=True)

    primary_image_url = Column(Text)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(Text, nullable=False)
    storage_type = Column(String(20), default="cloudinary")
    is_primary = Column(Boolean, default=False)
    ordering = Column(Integer, default=0)

    public_url = Column(Text)
    cloudinary_public_id = Column(String(255))
    file_size_bytes = Column(Integer)
    width_px = Column(Integer)
    height_px = Column(Integer)
    format = Column(String(10))

    color_palette = Column(JSON)
    dominant_color = Column(String(7))

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))


class ProductTransaction(Base):
    __tablename__ = "product_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    merchant_id = Column(UUID(as_uuid=True), ForeignKey("merchants.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    transaction_type = Column(String(20), nullable=False)
    quantity = Column(Integer, nullable=False)
    quantity_before = Column(Integer, nullable=False)
    quantity_after = Column(Integer, nullable=False)
    notes = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ProductActivityLog(Base):
    __tablename__ = "product_activity_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    merchant_id = Column(UUID(as_uuid=True), ForeignKey("merchants.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    activity_type = Column(String(50), nullable=False)
    changes = Column(JSON)
    description = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
