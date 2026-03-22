-- Denormalized display labels on products (no per-row reference joins on list APIs)
-- and default labels on sub_categories (snapshots at subcategory create)

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS surface_type_name VARCHAR(120),
    ADD COLUMN IF NOT EXISTS application_type_name VARCHAR(120),
    ADD COLUMN IF NOT EXISTS body_type_name VARCHAR(120),
    ADD COLUMN IF NOT EXISTS quality_name VARCHAR(120);

ALTER TABLE sub_categories
    ADD COLUMN IF NOT EXISTS default_application_type_name VARCHAR(120),
    ADD COLUMN IF NOT EXISTS default_body_type_name VARCHAR(120),
    ADD COLUMN IF NOT EXISTS default_surface_type_name VARCHAR(120),
    ADD COLUMN IF NOT EXISTS default_quality_name VARCHAR(120);

UPDATE products AS p
SET
    surface_type_name = st.name,
    application_type_name = at.name,
    body_type_name = bt.name,
    quality_name = q.name
FROM surface_types st, application_types at, body_types bt, qualities q
WHERE p.surface_type_id = st.id
  AND p.application_type_id = at.id
  AND p.body_type_id = bt.id
  AND p.quality_id = q.id;

UPDATE sub_categories AS sc
SET default_application_type_name = at.name
FROM application_types at
WHERE sc.application_type_id = at.id
  AND sc.default_application_type_name IS NULL;

UPDATE sub_categories AS sc
SET default_body_type_name = bt.name
FROM body_types bt
WHERE sc.body_type_id = bt.id
  AND sc.default_body_type_name IS NULL;
