-- Optional FK from sub_categories to admin sizes (nullable for legacy rows).
-- Run after add_sizes_table.sql / add_size_fields.sql so `sizes` exists.

ALTER TABLE sub_categories
    ADD COLUMN IF NOT EXISTS size_id UUID REFERENCES sizes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sub_categories_size_id ON sub_categories(size_id);

-- Optional backfill (uncomment and run manually if desired):
-- UPDATE sub_categories sc
-- SET size_id = s.id
-- FROM sizes s
-- WHERE s.is_active = TRUE
--   AND sc.size_id IS NULL
--   AND REPLACE(REPLACE(LOWER(TRIM(sc.size)), ' ', ''), '"', '')
--       = REPLACE(REPLACE(LOWER(TRIM(s.name)), ' ', ''), '"', '');
