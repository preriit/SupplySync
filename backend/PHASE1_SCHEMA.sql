# Phase 1 Database Schema - Simplified

## Core Tables (Phase 1 Focus)

```sql
-- USERS (Enhanced for dealer/subdealer)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    metadata JSONB
);

-- MERCHANTS (Dealers' organizations)
CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- CATEGORIES
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    ordering INT DEFAULT 0,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- DEALER-SUBDEALER PERMISSIONS
CREATE TABLE dealer_subdealer_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    dealer_id UUID REFERENCES merchants(id) NOT NULL,
    subdealer_id UUID REFERENCES users(id) NOT NULL,
    
    status VARCHAR(20) DEFAULT 'pending',
    -- 'pending', 'active', 'rejected', 'revoked'
    
    -- Who initiated?
    initiated_by VARCHAR(20), -- 'dealer' or 'subdealer'
    
    -- Invite code (if dealer invited)
    invite_code VARCHAR(50) UNIQUE,
    
    requested_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP,
    revoked_at TIMESTAMP,
    
    notes TEXT,
    
    UNIQUE(dealer_id, subdealer_id)
);

-- ORDER REQUESTS (Phase 1: Basic tracking only)
CREATE TABLE order_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    subdealer_id UUID REFERENCES users(id) NOT NULL,
    dealer_id UUID REFERENCES merchants(id) NOT NULL,
    
    request_number VARCHAR(50) UNIQUE,
    request_date TIMESTAMP DEFAULT NOW(),
    
    status VARCHAR(20) DEFAULT 'pending',
    -- 'pending', 'approved', 'rejected', 'cancelled'
    
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
CREATE TABLE order_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_request_id UUID REFERENCES order_requests(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2),
    total_price DECIMAL(10, 2),
    
    product_snapshot JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- INVENTORY LOGS (Track quantity changes)
CREATE TABLE inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    
    change_type VARCHAR(20), -- 'manual_adjustment', 'order_approved'
    quantity_change INT,
    quantity_before INT,
    quantity_after INT,
    
    reason TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- NOTIFICATIONS (Simple notification system)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    
    notification_type VARCHAR(50),
    -- 'access_request', 'access_approved', 'order_request', 'order_approved', etc.
    
    title VARCHAR(255),
    message TEXT,
    link VARCHAR(500),
    
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Indexes for Performance

```sql
-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_type ON users(user_type);
CREATE INDEX idx_users_merchant ON users(merchant_id);

-- Products
CREATE INDEX idx_products_merchant ON products(merchant_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_name ON products(name);

-- Permissions
CREATE INDEX idx_permissions_dealer ON dealer_subdealer_permissions(dealer_id);
CREATE INDEX idx_permissions_subdealer ON dealer_subdealer_permissions(subdealer_id);
CREATE INDEX idx_permissions_status ON dealer_subdealer_permissions(status);
CREATE INDEX idx_permissions_code ON dealer_subdealer_permissions(invite_code);

-- Order Requests
CREATE INDEX idx_order_requests_subdealer ON order_requests(subdealer_id);
CREATE INDEX idx_order_requests_dealer ON order_requests(dealer_id);
CREATE INDEX idx_order_requests_status ON order_requests(status);
CREATE INDEX idx_order_requests_date ON order_requests(request_date DESC);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
```

## Stock Level Logic (Hide Exact Quantities)

```python
def get_stock_level_display(quantity):
    """
    Phase 1: Show stock levels without exact quantities
    """
    if quantity >= 100:
        return "In Stock", "success"
    elif quantity >= 20:
        return "Limited Stock", "warning"
    elif quantity > 0:
        return "Low Stock", "danger"
    else:
        return "Out of Stock", "error"

# Example usage in API response:
{
    "product_id": "uuid",
    "name": "Kajaria Beige 12x12",
    "price": 480,
    "stock_level": "In Stock",  # NOT actual quantity!
    "stock_status": "success"
}
```

## Phase 2 Tables (Future - Not Building Now)

```sql
-- These will be added in Phase 2:
-- pricing_tiers (custom pricing per subdealer)
-- payments (payment tracking)
-- shipments (order fulfillment)
-- dealer_ratings (subdealer rates dealers)
-- product_analytics (detailed tracking)
```

---

## Key Differences from Original Django Schema

**Simplified for Phase 1:**
- No soft delete (hard delete for now, can add later)
- No audit trail (focused on core features)
- No complex pricing (single price per product)
- No payment tracking (tracking orders only)
- Stock levels abstracted (not showing exact quantities)

**Enhanced for Marketplace:**
- User type differentiation (dealer vs subdealer)
- Permission management
- Order request workflow
- Notification system

---

**This schema is focused, practical, and ready for Phase 1 MVP! 🚀**
