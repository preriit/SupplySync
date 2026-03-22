"""Tile coverage: per piece (from mm) and per box (× packing)."""

MM2_PER_SQM = 1_000_000.0
SQFT_PER_SQM = 10.764


def coverage_per_pc_from_mm(width_mm: int, height_mm: int) -> tuple[float, float]:
    """coverage_per_pc_sqm = W*H/1e6; coverage_per_pc_sqm * 10.764 for sqft."""
    sqm = (width_mm * height_mm) / MM2_PER_SQM
    sqft = sqm * SQFT_PER_SQM
    return sqm, sqft


def coverage_per_box_from_pc(
    coverage_per_pc_sqm: float, coverage_per_pc_sqft: float, packing_per_box: int
) -> tuple[float, float]:
    return (
        coverage_per_pc_sqm * packing_per_box,
        coverage_per_pc_sqft * packing_per_box,
    )


def coverage_per_pc_for_subcategory(subcat) -> tuple[float, float]:
    """Use stored columns when present; else derive from subcategory mm."""
    sqm = getattr(subcat, "coverage_per_pc_sqm", None)
    sqft = getattr(subcat, "coverage_per_pc_sqft", None)
    if sqm is not None:
        sqm_f = float(sqm)
        if sqft is not None:
            return sqm_f, float(sqft)
        return sqm_f, sqm_f * SQFT_PER_SQM
    return coverage_per_pc_from_mm(subcat.width_mm, subcat.height_mm)
