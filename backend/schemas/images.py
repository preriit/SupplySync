"""Pydantic models for product image APIs."""

from typing import List, Optional

from pydantic import BaseModel


class ImageUploadResponse(BaseModel):
    id: str
    image_url: str
    is_primary: bool
    ordering: int
    dominant_color: Optional[str] = None
    color_palette: Optional[List[str]] = None
