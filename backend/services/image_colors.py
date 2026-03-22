"""Dominant color extraction for uploaded product images."""

import logging
import os
import tempfile

from colorthief import ColorThief


def rgb_to_hex(rgb):
    return "#{:02x}{:02x}{:02x}".format(rgb[0], rgb[1], rgb[2])


def extract_colors_from_image(image_bytes: bytes):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp_file:
            tmp_file.write(image_bytes)
            tmp_file.flush()
            color_thief = ColorThief(tmp_file.name)
            dominant_color = color_thief.get_color(quality=1)
            palette = color_thief.get_palette(color_count=5, quality=1)
            dominant_hex = rgb_to_hex(dominant_color)
            palette_hex = [rgb_to_hex(color) for color in palette]
            os.unlink(tmp_file.name)
            return {"dominant_color": dominant_hex, "color_palette": palette_hex}
    except Exception as e:
        logging.error("Color extraction error: %s", e)
        return {"dominant_color": None, "color_palette": []}
