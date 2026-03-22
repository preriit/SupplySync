"""Reference / lookup tables: body, make, surface, application, quality, tile sizes."""

from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from database import Base
import uuid


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
    body_type_id = Column(UUID(as_uuid=True), ForeignKey("body_types.id"))
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
    name = Column(String(50), unique=True, nullable=False)  # inches label, e.g. "24 x 24"
    name_mm = Column(String(50))
    height_inches = Column(Integer, nullable=False)
    width_inches = Column(Integer, nullable=False)
    height_mm = Column(Integer, nullable=False)
    width_mm = Column(Integer, nullable=False)
    default_packaging_per_box = Column(Integer, nullable=False)
    application_type_id = Column(UUID(as_uuid=True), ForeignKey("application_types.id"))
    body_type_id = Column(UUID(as_uuid=True), ForeignKey("body_types.id"))
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
