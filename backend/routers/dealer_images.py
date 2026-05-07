"""Product image upload (Cloudinary), listing, primary, delete, reorder."""

import io
import logging
import os
from typing import List

import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, Body, Depends, File, HTTPException, UploadFile
from PIL import Image
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Product, ProductImage, User
from schemas.images import ImageUploadResponse
from services.image_colors import extract_colors_from_image
from services.product_activity import log_product_activity

cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
)

router = APIRouter(prefix="/dealer", tags=["dealer"])


@router.post(
    "/products/{product_id}/images/upload",
    response_model=List[ImageUploadResponse],
)
async def upload_product_images(
    product_id: str,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .filter(
            Product.id == product_id,
            Product.merchant_id == current_user.merchant_id,
        )
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    max_ordering = (
        db.query(func.max(ProductImage.ordering))
        .filter(ProductImage.product_id == product_id)
        .scalar()
        or 0
    )

    uploaded_images = []

    for idx, file in enumerate(files):
        if not file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=400,
                detail=f"File {file.filename} is not an image",
            )

        image_bytes = await file.read()
        img = Image.open(io.BytesIO(image_bytes))
        width, height = img.size
        file_format = img.format.lower() if img.format else "unknown"

        try:
            upload_result = cloudinary.uploader.upload(
                image_bytes,
                folder="supplysync/products",
                resource_type="image",
            )
            colors = extract_colors_from_image(image_bytes)

            new_image = ProductImage(
                product_id=product_id,
                image_url=upload_result["secure_url"],
                public_url=upload_result["secure_url"],
                cloudinary_public_id=upload_result["public_id"],
                storage_type="cloudinary",
                is_primary=False,
                ordering=max_ordering + idx + 1,
                file_size_bytes=len(image_bytes),
                width_px=width,
                height_px=height,
                format=file_format,
                color_palette=colors["color_palette"],
                dominant_color=colors["dominant_color"],
                uploaded_by=current_user.id,
            )
            db.add(new_image)
            db.flush()

            uploaded_images.append(
                {
                    "id": str(new_image.id),
                    "image_url": new_image.image_url,
                    "is_primary": new_image.is_primary,
                    "ordering": new_image.ordering,
                    "dominant_color": new_image.dominant_color,
                    "color_palette": new_image.color_palette,
                }
            )
        except Exception as e:
            logging.error("Upload error: %s", e)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload {file.filename}: {str(e)}",
            )

    db.commit()

    log_product_activity(
        db=db,
        product_id=product_id,
        merchant_id=str(current_user.merchant_id),
        user_id=str(current_user.id),
        activity_type="images_uploaded",
        description=f"Uploaded {len(files)} image(s)",
        changes={"image_count": len(files)},
    )
    db.commit()

    return uploaded_images


@router.get("/products/{product_id}/images")
async def get_product_images(
    product_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .filter(
            Product.id == product_id,
            Product.merchant_id == current_user.merchant_id,
        )
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    images = db.execute(
        text(
            """
            select
                id,
                image_url,
                coalesce(is_primary, false) as is_primary,
                ordering,
                uploaded_at as created_at
            from product_images
            where product_id = :product_id
              and image_url is not null
              and image_url <> ''
            order by
                case when coalesce(is_primary, false) then 0 else 1 end,
                coalesce(ordering, 999999),
                uploaded_at,
                id
            """
        ),
        {"product_id": product_id},
    ).fetchall()

    return [
        {
            "id": str(img.id),
            "image_url": img.image_url,
            "is_primary": bool(img.is_primary),
            "ordering": img.ordering,
            "created_at": img.created_at.isoformat() if img.created_at else None,
        }
        for img in images
    ]


@router.put("/products/{product_id}/images/{image_id}/primary")
async def set_primary_image(
    product_id: str,
    image_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .filter(
            Product.id == product_id,
            Product.merchant_id == current_user.merchant_id,
        )
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    image = (
        db.query(ProductImage)
        .filter(
            ProductImage.id == image_id,
            ProductImage.product_id == product_id,
        )
        .first()
    )
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    image.is_primary = True
    db.commit()

    log_product_activity(
        db=db,
        product_id=product_id,
        merchant_id=str(current_user.merchant_id),
        user_id=str(current_user.id),
        activity_type="primary_image_changed",
        description="Set primary image",
        changes={"image_id": str(image_id)},
    )
    db.commit()

    return {"message": "Primary image updated successfully"}


@router.delete("/products/{product_id}/images/{image_id}")
async def delete_product_image(
    product_id: str,
    image_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .filter(
            Product.id == product_id,
            Product.merchant_id == current_user.merchant_id,
        )
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    image = (
        db.query(ProductImage)
        .filter(
            ProductImage.id == image_id,
            ProductImage.product_id == product_id,
        )
        .first()
    )
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    if image.storage_type == "cloudinary" and image.cloudinary_public_id:
        try:
            cloudinary.uploader.destroy(image.cloudinary_public_id)
        except Exception as e:
            logging.error("Failed to delete from Cloudinary: %s", e)

    db.delete(image)
    db.commit()

    log_product_activity(
        db=db,
        product_id=product_id,
        merchant_id=str(current_user.merchant_id),
        user_id=str(current_user.id),
        activity_type="image_deleted",
        description="Deleted image",
        changes={"image_id": str(image_id)},
    )
    db.commit()

    return {"message": "Image deleted successfully"}


@router.put("/products/{product_id}/images/reorder")
async def reorder_product_images(
    product_id: str,
    image_ids: List[str] = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .filter(
            Product.id == product_id,
            Product.merchant_id == current_user.merchant_id,
        )
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    for idx, image_id in enumerate(image_ids):
        db.query(ProductImage).filter(
            ProductImage.id == image_id,
            ProductImage.product_id == product_id,
        ).update({"ordering": idx})

    db.commit()
    return {"message": "Images reordered successfully"}
