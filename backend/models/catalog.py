"""Product family categories and shared sub-categories (size + make type)."""

from sqlalchemy import Column, String, Boolean, Integer, Text, DateTime, ForeignKey, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from database import Base
import uuid


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
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    name = Column(String(255), nullable=False)

    size = Column(String(50), nullable=False)
    height_inches = Column(Integer, nullable=False)
    width_inches = Column(Integer, nullable=False)
    height_mm = Column(Integer, nullable=False)
    width_mm = Column(Integer, nullable=False)

    make_type_id = Column(UUID(as_uuid=True), ForeignKey("make_types.id"), nullable=True)
    size_id = Column(UUID(as_uuid=True), ForeignKey("sizes.id", ondelete="SET NULL"), nullable=True)

    application_type_id = Column(
        UUID(as_uuid=True), ForeignKey("application_types.id", ondelete="SET NULL"), nullable=True
    )
    body_type_id = Column(UUID(as_uuid=True), ForeignKey("body_types.id", ondelete="SET NULL"), nullable=True)

    # Snapshot labels at subcategory create (defaults copied onto new products without list-time joins)
    default_application_type_name = Column(String(120), nullable=True)
    default_body_type_name = Column(String(120), nullable=True)
    default_surface_type_name = Column(String(120), nullable=True)
    default_quality_name = Column(String(120), nullable=True)

    default_packing_per_box = Column(Integer, default=10)

    coverage_per_pc_sqm = Column(Float, nullable=True)
    coverage_per_pc_sqft = Column(Float, nullable=True)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
