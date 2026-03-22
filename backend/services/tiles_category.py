"""Ensure the Tiles parent category exists for dealer subcategory flows."""

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from models import Category


def get_or_create_tiles_category(db: Session) -> Category:
    """Ensure parent category slug=tiles exists (seed may be missing on migrated DBs)."""
    cat = db.query(Category).filter(Category.slug == "tiles").first()
    if cat:
        return cat
    legacy = db.query(Category).filter(Category.name == "Tiles").first()
    if legacy:
        legacy.slug = "tiles"
        if legacy.description is None:
            legacy.description = "Ceramic and Vitrified Tiles"
        db.commit()
        db.refresh(legacy)
        return legacy
    cat = Category(
        name="Tiles",
        slug="tiles",
        description="Ceramic and Vitrified Tiles",
        display_order=1,
        is_active=True,
    )
    db.add(cat)
    try:
        db.commit()
        db.refresh(cat)
        return cat
    except IntegrityError:
        db.rollback()
        cat = db.query(Category).filter(Category.slug == "tiles").first()
        if cat:
            return cat
        raise
