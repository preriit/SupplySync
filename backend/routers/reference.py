"""Public reference data for dealer UI (sizes, make types, tile attributes)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import (
    Size,
    MakeType,
    SurfaceType,
    ApplicationType,
    BodyType,
    Quality,
)

router = APIRouter(prefix="/reference", tags=["reference"])


@router.get("/tile-sizes")
async def get_tile_sizes(db: Session = Depends(get_db)):
    """Get tile sizes from database (admin-managed)."""
    sizes = db.query(Size).filter(Size.is_active == True).order_by(Size.display_order).all()
    return {
        "sizes": [
            {
                "id": str(size.id),
                "value": size.name,
                "label": f"{size.name} ({size.height_mm}x{size.width_mm}mm)",
                "height_inches": size.height_inches,
                "width_inches": size.width_inches,
                "height_mm": size.height_mm,
                "width_mm": size.width_mm,
                "default_packaging_per_box": size.default_packaging_per_box,
                "application_type_id": str(size.application_type_id)
                if size.application_type_id
                else None,
                "body_type_id": str(size.body_type_id) if size.body_type_id else None,
            }
            for size in sizes
        ]
    }


@router.get("/make-types")
async def get_make_types(db: Session = Depends(get_db)):
    make_types = db.query(MakeType).filter(MakeType.is_active == True).order_by(MakeType.display_order).all()
    return {
        "make_types": [
            {
                "id": str(mt.id),
                "name": mt.name,
                "body_type_id": str(mt.body_type_id) if mt.body_type_id else None,
            }
            for mt in make_types
        ]
    }


@router.get("/surface-types")
async def get_surface_types(db: Session = Depends(get_db)):
    surface_types = db.query(SurfaceType).filter(SurfaceType.is_active == True).order_by(SurfaceType.display_order).all()
    return {
        "surface_types": [
            {"id": str(st.id), "name": st.name}
            for st in surface_types
        ]
    }


@router.get("/application-types")
async def get_application_types(db: Session = Depends(get_db)):
    app_types = db.query(ApplicationType).filter(ApplicationType.is_active == True).order_by(ApplicationType.display_order).all()
    return {
        "application_types": [
            {"id": str(at.id), "name": at.name}
            for at in app_types
        ]
    }


@router.get("/body-types")
async def get_body_types(db: Session = Depends(get_db)):
    body_types = db.query(BodyType).filter(BodyType.is_active == True).order_by(BodyType.display_order).all()
    return {
        "body_types": [
            {"id": str(bt.id), "name": bt.name}
            for bt in body_types
        ]
    }


@router.get("/qualities")
async def get_qualities(db: Session = Depends(get_db)):
    qualities = db.query(Quality).filter(Quality.is_active == True).order_by(Quality.display_order).all()
    return {
        "qualities": [
            {"id": str(q.id), "name": q.name}
            for q in qualities
        ]
    }
