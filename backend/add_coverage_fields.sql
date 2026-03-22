-- Per-tile and per-box coverage (sq m / sq ft).

ALTER TABLE sub_categories ADD COLUMN IF NOT EXISTS coverage_per_pc_sqm DOUBLE PRECISION;
ALTER TABLE sub_categories ADD COLUMN IF NOT EXISTS coverage_per_pc_sqft DOUBLE PRECISION;

UPDATE sub_categories SET
    coverage_per_pc_sqm = (width_mm::double precision * height_mm::double precision) / 1000000.0,
    coverage_per_pc_sqft = ((width_mm::double precision * height_mm::double precision) / 1000000.0) * 10.764
WHERE coverage_per_pc_sqm IS NULL;

ALTER TABLE products ADD COLUMN IF NOT EXISTS coverage_per_pc_sqm DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS coverage_per_pc_sqft DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS coverage_per_box_sqm DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS coverage_per_box_sqft DOUBLE PRECISION;

UPDATE products p SET
    coverage_per_pc_sqm = sc.coverage_per_pc_sqm,
    coverage_per_pc_sqft = sc.coverage_per_pc_sqft
FROM sub_categories sc
WHERE p.sub_category_id = sc.id
  AND p.coverage_per_pc_sqm IS NULL
  AND sc.coverage_per_pc_sqm IS NOT NULL;

UPDATE products SET
    coverage_per_box_sqm = coverage_per_pc_sqm * packing_per_box,
    coverage_per_box_sqft = coverage_per_pc_sqft * packing_per_box
WHERE coverage_per_box_sqm IS NULL
  AND coverage_per_pc_sqm IS NOT NULL;
