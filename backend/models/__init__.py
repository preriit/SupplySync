"""
SQLAlchemy ORM models for SupplySync.

Split by domain for readability. Import from here for a stable public API:

    from models import User, Product, Size
"""

from .reference import (
    BodyType,
    MakeType,
    SurfaceType,
    ApplicationType,
    Quality,
    Size,
)
from .catalog import Category, SubCategory
from .identity import Merchant, User
from .products import (
    Product,
    ProductImage,
    ProductTransaction,
    ProductActivityLog,
)

__all__ = [
    "BodyType",
    "MakeType",
    "SurfaceType",
    "ApplicationType",
    "Quality",
    "Size",
    "Category",
    "SubCategory",
    "Merchant",
    "User",
    "Product",
    "ProductImage",
    "ProductTransaction",
    "ProductActivityLog",
]
