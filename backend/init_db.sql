-- SupplySync Phase 1 Database Schema
-- Create tables for the B2B Tile Marketplace

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- MERCHANTS (Dealers' organizations)
CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    postal_code VARCHAR(20),
    gst_number VARCHAR(20),
    pan VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);

-- USERS (Enhanced for dealer/subdealer)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    
    -- User type
    user_type VARCHAR(20) NOT NULL, -- 'dealer' or 'subdealer'
    
    -- For dealers only (NULL for subdealers)
    merchant_id UUID REFERENCES merchants(id),
    role VARCHAR(20), -- 'admin', 'manager', 'viewer'
    
    -- For subdealers only (NULL for dealers)
    business_name VARCHAR(255),
    business_address TEXT,
    gst_number VARCHAR(20),
    
    -- Language preference
    preferred_language VARCHAR(5) DEFAULT 'en',
    
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    metadata JSONB
);

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID REFERENCES merchants(id),
    name VARCHAR(255) NOT NULL,
    height_inches INT,
    width_inches INT,
    height_mm INT,
    width_mm INT,
    make_type VARCHAR(100),
    application_type VARCHAR(100),
    body_type VARCHAR(100),
    quality VARCHAR(100),
    default_packing_per_box INT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- PRODUCTS
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID REFERENCES merchants(id) NOT NULL,
    category_id UUID REFERENCES categories(id),
    
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    sku VARCHAR(100),
    
    height_inches INT,
    width_inches INT,
    height_mm INT,
    width_mm INT,
    surface_type VARCHAR(50),
    packing_per_box INT,
    
    current_quantity INT DEFAULT 0,
    current_price DECIMAL(10, 2),
    
    primary_image_url TEXT,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);

-- PRODUCT IMAGES
CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    ordering INT DEFAULT 0,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- DEALER-SUBDEALER PERMISSIONS
CREATE TABLE IF NOT EXISTS dealer_subdealer_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    dealer_id UUID REFERENCES merchants(id) NOT NULL,
    subdealer_id UUID REFERENCES users(id) NOT NULL,
    
    status VARCHAR(20) DEFAULT 'pending',
    
    initiated_by VARCHAR(20),
    invite_code VARCHAR(50) UNIQUE,
    
    requested_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP,
    revoked_at TIMESTAMP,
    
    notes TEXT,
    
    UNIQUE(dealer_id, subdealer_id)
);

-- ORDER REQUESTS
CREATE TABLE IF NOT EXISTS order_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    subdealer_id UUID REFERENCES users(id) NOT NULL,
    dealer_id UUID REFERENCES merchants(id) NOT NULL,
    
    request_number VARCHAR(50) UNIQUE,
    request_date TIMESTAMP DEFAULT NOW(),
    
    status VARCHAR(20) DEFAULT 'pending',
    
    subtotal DECIMAL(10, 2),
    tax_amount DECIMAL(10, 2),
    total_amount DECIMAL(10, 2),
    
    customer_name VARCHAR(255),
    delivery_address TEXT,
    
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES users(id),
    
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ORDER REQUEST ITEMS
CREATE TABLE IF NOT EXISTS order_request_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_request_id UUID REFERENCES order_requests(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2),
    total_price DECIMAL(10, 2),
    
    product_snapshot JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- INVENTORY LOGS
CREATE TABLE IF NOT EXISTS inventory_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id),
    
    change_type VARCHAR(20),
    quantity_change INT,
    quantity_before INT,
    quantity_after INT,
    
    reason TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    
    notification_type VARCHAR(50),
    
    title VARCHAR(255),
    message TEXT,
    link VARCHAR(500),
    
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- INDEXES for Performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_merchant ON users(merchant_id);

CREATE INDEX IF NOT EXISTS idx_products_merchant ON products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

CREATE INDEX IF NOT EXISTS idx_permissions_dealer ON dealer_subdealer_permissions(dealer_id);
CREATE INDEX IF NOT EXISTS idx_permissions_subdealer ON dealer_subdealer_permissions(subdealer_id);
CREATE INDEX IF NOT EXISTS idx_permissions_status ON dealer_subdealer_permissions(status);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON dealer_subdealer_permissions(invite_code);

CREATE INDEX IF NOT EXISTS idx_order_requests_subdealer ON order_requests(subdealer_id);
CREATE INDEX IF NOT EXISTS idx_order_requests_dealer ON order_requests(dealer_id);
CREATE INDEX IF NOT EXISTS idx_order_requests_status ON order_requests(status);
CREATE INDEX IF NOT EXISTS idx_order_requests_date ON order_requests(request_date DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
