-- Coverage columns for sizes table.
ALTER TABLE sizes ADD COLUMN IF NOT EXISTS coverage_per_pc_sqm DOUBLE PRECISION;
ALTER TABLE sizes ADD COLUMN IF NOT EXISTS coverage_per_pc_sqft DOUBLE PRECISION;

-- Backfill from mm dimensions when missing.
UPDATE sizes
SET
    coverage_per_pc_sqm = (width_mm::double precision * height_mm::double precision) / 1000000.0,
    coverage_per_pc_sqft = ((width_mm::double precision * height_mm::double precision) / 1000000.0) * 10.764
WHERE coverage_per_pc_sqm IS NULL
  AND width_mm IS NOT NULL
  AND height_mm IS NOT NULL;
