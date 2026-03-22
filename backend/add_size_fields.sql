-- Add new fields to sizes table for comprehensive size management
-- These fields make sizes reusable templates for products

-- 1. Add name_mm column for mm representation
ALTER TABLE sizes 
ADD COLUMN IF NOT EXISTS name_mm VARCHAR(50);

-- 2. Add default packaging per box (default for existing rows)
ALTER TABLE sizes 
ADD COLUMN IF NOT EXISTS default_packaging_per_box INTEGER DEFAULT 10;

-- 3. Add application_type_id foreign key
ALTER TABLE sizes 
ADD COLUMN IF NOT EXISTS application_type_id UUID REFERENCES application_types(id);

-- 4. Add body_type_id foreign key
ALTER TABLE sizes 
ADD COLUMN IF NOT EXISTS body_type_id UUID REFERENCES body_types(id);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sizes_application_type ON sizes(application_type_id);
CREATE INDEX IF NOT EXISTS idx_sizes_body_type ON sizes(body_type_id);

-- 6. Add comments
COMMENT ON COLUMN sizes.name IS 'Size name in inches format (e.g., 24 x 48)';
COMMENT ON COLUMN sizes.name_mm IS 'Size name in mm format (e.g., 600 x 1200)';
COMMENT ON COLUMN sizes.default_packaging_per_box IS 'Default number of pieces per box';
COMMENT ON COLUMN sizes.application_type_id IS 'Default application type for products using this size';
COMMENT ON COLUMN sizes.body_type_id IS 'Default body type for products using this size';
