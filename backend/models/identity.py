"""Merchants and users."""

from sqlalchemy import Column, String, Boolean, Text, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from database import Base
import uuid


class Merchant(Base):
    __tablename__ = "merchants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255))
    phone = Column(String(20))
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100), default="India")
    postal_code = Column(String(20))
    gst_number = Column(String(20))
    pan = Column(String(20))

    subscription_status = Column(String(20), default="trial")
    subscription_plan = Column(String(50))
    subscription_started_at = Column(DateTime(timezone=True))
    subscription_expires_at = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    deleted_at = Column(DateTime(timezone=True))

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    extra_data = Column("metadata", JSON)


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(20), unique=True)
    password_hash = Column(String(255), nullable=False)
    user_type = Column(String(20), nullable=False)
    merchant_id = Column(UUID(as_uuid=True), ForeignKey("merchants.id"))
    role = Column(String(20))
    business_name = Column(String(255))
    business_address = Column(Text)
    gst_number = Column(String(20))
    preferred_language = Column(String(5), default="en")
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True))
    deleted_at = Column(DateTime(timezone=True))
    extra_data = Column("metadata", JSON)
