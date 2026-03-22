-- Subcategory defaults: application + body type, make_type optional for new rows.
-- Run after application_types, body_types, make_types, sub_categories exist.

ALTER TABLE sub_categories
    ADD COLUMN IF NOT EXISTS application_type_id UUID REFERENCES application_types(id) ON DELETE SET NULL;

ALTER TABLE sub_categories
    ADD COLUMN IF NOT EXISTS body_type_id UUID REFERENCES body_types(id) ON DELETE SET NULL;

ALTER TABLE sub_categories
    ALTER COLUMN make_type_id DROP NOT NULL;

-- Old UNIQUE(category_id, size, make_type_id) disallows duplicate NULL make_type in some DBs
-- and blocks NULL make_type. Replace with partial unique indexes.
ALTER TABLE sub_categories DROP CONSTRAINT IF EXISTS sub_categories_category_id_size_make_type_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sub_categories_cat_size_make_when_set
    ON sub_categories (category_id, size, make_type_id)
    WHERE make_type_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sub_categories_cat_size_when_no_make
    ON sub_categories (category_id, size)
    WHERE make_type_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_sub_categories_application_type ON sub_categories(application_type_id);
CREATE INDEX IF NOT EXISTS idx_sub_categories_body_type ON sub_categories(body_type_id);
