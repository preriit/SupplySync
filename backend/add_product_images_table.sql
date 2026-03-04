-- Migration: Add product_images table for image upload feature
-- Supports both legacy S3 (from Django) and new Cloudinary uploads

CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Image URLs (support both S3 legacy and Cloudinary new)
    image_url TEXT NOT NULL,
    storage_type VARCHAR(20) DEFAULT 'cloudinary',  -- 's3' or 'cloudinary'
    
    -- Display properties
    is_primary BOOLEAN DEFAULT FALSE,
    ordering INTEGER DEFAULT 0,
    
    -- Image metadata (for Cloudinary images)
    public_url TEXT,
    cloudinary_public_id VARCHAR(255),  -- For deletion from Cloudinary
    file_size_bytes INTEGER,
    width_px INTEGER,
    height_px INTEGER,
    format VARCHAR(10),
    
    -- Color extraction (auto-extracted on upload)
    color_palette JSONB,        -- Array of hex colors: ["#FF5733", "#C70039", ...]
    dominant_color VARCHAR(7),  -- Single dominant color in hex
    
    -- Timestamps and user tracking
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    uploaded_by UUID REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_primary ON product_images(product_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_product_images_ordering ON product_images(product_id, ordering);

-- Ensure only one primary image per product (trigger)
CREATE OR REPLACE FUNCTION ensure_single_primary_image()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = TRUE THEN
        UPDATE product_images 
        SET is_primary = FALSE 
        WHERE product_id = NEW.product_id 
          AND id != NEW.id 
          AND is_primary = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_primary_image
    BEFORE INSERT OR UPDATE ON product_images
    FOR EACH ROW
    WHEN (NEW.is_primary = TRUE)
    EXECUTE FUNCTION ensure_single_primary_image();

-- If no primary image exists, make first image primary
CREATE OR REPLACE FUNCTION set_first_image_as_primary()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM product_images 
        WHERE product_id = NEW.product_id 
          AND is_primary = TRUE
    ) THEN
        NEW.is_primary = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_first_image_as_primary
    BEFORE INSERT ON product_images
    FOR EACH ROW
    EXECUTE FUNCTION set_first_image_as_primary();
