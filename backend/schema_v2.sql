-- SupplySync V2 Schema - Tiles Inventory Management
-- Clear Category > Sub-Category > Product hierarchy

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- REFERENCE TABLES (Pre-defined options for dropdowns)
-- =====================================================

-- BODY TYPES
CREATE TABLE IF NOT EXISTS body_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- MAKE TYPES
CREATE TABLE IF NOT EXISTS make_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    body_type_id UUID REFERENCES body_types(id),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- SURFACE TYPES
CREATE TABLE IF NOT EXISTS surface_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- APPLICATION TYPES
CREATE TABLE IF NOT EXISTS application_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- QUALITIES
CREATE TABLE IF NOT EXISTS qualities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- MAIN TABLES
-- =====================================================

-- CATEGORIES (High-level: Tiles, Plywood, Laminate, Sanitary)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- SUB-CATEGORIES (Shared across all merchants - Size + MakeType)
CREATE TABLE IF NOT EXISTS sub_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) NOT NULL,
    name VARCHAR(255) NOT NULL,  -- Auto-generated: "12x12 GVT"
    
    -- Size information
    size VARCHAR(50) NOT NULL,  -- "12x12", "16x16", "24x24"
    height_inches INT NOT NULL,
    width_inches INT NOT NULL,
    height_mm INT NOT NULL,
    width_mm INT NOT NULL,
    
    -- Make type
    make_type_id UUID REFERENCES make_types(id) NOT NULL,
    
    -- Defaults
    default_packing_per_box INT DEFAULT 10,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure unique sub-categories (same size + make = same sub-category)
    UNIQUE(category_id, size, make_type_id)
);

-- Update existing products table to use new structure
DROP TABLE IF EXISTS products CASCADE;

-- PRODUCTS (Merchant-specific items under shared sub-categories)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID REFERENCES merchants(id) NOT NULL,
    sub_category_id UUID REFERENCES sub_categories(id) NOT NULL,
    
    -- Product identification
    brand VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    
    -- Tile attributes
    surface_type_id UUID REFERENCES surface_types(id) NOT NULL,
    application_type_id UUID REFERENCES application_types(id) NOT NULL,
    body_type_id UUID REFERENCES body_types(id) NOT NULL,
    quality_id UUID REFERENCES qualities(id) NOT NULL,
    
    -- Stock information
    current_quantity INT DEFAULT 0,
    packing_per_box INT DEFAULT 10,
    
    -- Images
    primary_image_url TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure unique product names within merchant's sub-category
    UNIQUE(merchant_id, sub_category_id, brand, name)
);

-- PRODUCT IMAGES (Multiple images per product)
CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    ordering INT DEFAULT 0,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES for Performance
-- =====================================================

-- Sub-categories indexes
CREATE INDEX IF NOT EXISTS idx_sub_categories_category ON sub_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_sub_categories_make_type ON sub_categories(make_type_id);
CREATE INDEX IF NOT EXISTS idx_sub_categories_size ON sub_categories(size);
CREATE INDEX IF NOT EXISTS idx_sub_categories_active ON sub_categories(is_active);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_merchant ON products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_products_sub_category ON products(sub_category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_surface_type ON products(surface_type_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- Product images indexes
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_primary ON product_images(is_primary);
