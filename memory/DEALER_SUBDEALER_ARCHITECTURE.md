# SupplySync: Multi-Level Dealer Network Architecture

## Business Model

**SupplySync = B2B Tile Marketplace with Permission-Based Inventory Sharing**

### Stakeholders:

1. **Dealers (Merchants/Suppliers)**
   - Own and manage inventory
   - Grant access to sub-dealers
   - Receive and fulfill order requests
   - Control visibility of their inventory

2. **Sub-dealers (Buyers/Retailers)**
   - DON'T own inventory
   - Get permission from dealers to view their inventory
   - Search across multiple dealers' inventories
   - Place order requests
   - Fulfill customer orders using dealers' stock

3. **Platform Owner (You)**
   - Provides marketplace platform
   - Analytics and intelligence
   - Matchmaking between dealers and sub-dealers

### Network Effect:
```
More Dealers → More Inventory → Attracts More Sub-dealers
     ↑                                      ↓
     └───────── More Orders ←───────────────┘
```

---

## User Types & Roles

### User Type 1: DEALER
**Belongs to:** A Merchant (organization)
**Roles within merchant:**
- **Owner/Admin**: Full control
- **Manager**: Manage inventory, approve orders
- **Viewer**: Read-only access

**Capabilities:**
- ✅ Manage own inventory
- ✅ Grant/revoke access to sub-dealers
- ✅ Receive order requests from sub-dealers
- ✅ Approve/reject orders
- ✅ View own sales analytics
- ✅ See which sub-dealers are viewing their inventory

### User Type 2: SUB-DEALER
**Belongs to:** Self (independent user)
**Has:** Profile, but NO inventory

**Capabilities:**
- ✅ Request access from dealers
- ✅ View inventories of dealers who granted permission
- ✅ Search across multiple dealers' inventories
- ✅ Place order requests
- ✅ Track order status
- ✅ View purchase history
- ❌ Cannot manage inventory
- ❌ Cannot grant access to others

---

## Enhanced Database Schema

### 1. Updated Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255),
    
    -- User type
    user_type VARCHAR(20) NOT NULL, -- 'dealer', 'subdealer'
    
    -- For dealers only
    merchant_id UUID REFERENCES merchants(id), -- NULL for sub-dealers
    role VARCHAR(20), -- 'admin', 'manager', 'viewer' (NULL for sub-dealers)
    
    -- For sub-dealers
    business_name VARCHAR(255), -- sub-dealer's business name
    business_address JSONB,
    gst_number VARCHAR(20),
    
    -- Common fields
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    metadata JSONB
);
```

### 2. NEW: Dealer-SubDealer Permissions Table
```sql
CREATE TABLE dealer_subdealer_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    dealer_id UUID REFERENCES merchants(id) NOT NULL,
    subdealer_id UUID REFERENCES users(id) NOT NULL,
    
    -- Permission details
    permission_level VARCHAR(50) DEFAULT 'view_inventory',
    -- Options: 'view_inventory', 'view_prices', 'place_orders'
    
    status VARCHAR(20) DEFAULT 'pending',
    -- Options: 'pending', 'active', 'rejected', 'revoked'
    
    -- Request details
    requested_at TIMESTAMP DEFAULT NOW(),
    requested_by UUID REFERENCES users(id), -- who requested? dealer or subdealer
    
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES users(id), -- which dealer approved
    
    revoked_at TIMESTAMP,
    revoked_by UUID REFERENCES users(id),
    
    -- Additional settings
    can_see_prices BOOLEAN DEFAULT TRUE,
    can_place_orders BOOLEAN DEFAULT TRUE,
    max_order_amount DECIMAL(10, 2), -- optional credit limit
    
    notes TEXT,
    metadata JSONB,
    
    UNIQUE(dealer_id, subdealer_id) -- one permission record per dealer-subdealer pair
);

CREATE INDEX idx_permissions_dealer ON dealer_subdealer_permissions(dealer_id);
CREATE INDEX idx_permissions_subdealer ON dealer_subdealer_permissions(subdealer_id);
CREATE INDEX idx_permissions_status ON dealer_subdealer_permissions(status);
```

### 3. NEW: Order Requests Table
```sql
CREATE TABLE order_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Parties involved
    subdealer_id UUID REFERENCES users(id) NOT NULL,
    dealer_id UUID REFERENCES merchants(id) NOT NULL,
    
    -- Order details
    request_number VARCHAR(50) UNIQUE, -- auto-generated: ORD-2024-001
    request_date TIMESTAMP DEFAULT NOW(),
    
    status VARCHAR(20) DEFAULT 'pending',
    -- Options: 'pending', 'approved', 'rejected', 'fulfilled', 'cancelled'
    
    -- Financial
    subtotal DECIMAL(10, 2),
    tax_amount DECIMAL(10, 2),
    discount_amount DECIMAL(10, 2),
    total_amount DECIMAL(10, 2),
    
    -- Sub-dealer's customer details (optional)
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    delivery_address JSONB,
    
    -- Status updates
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES users(id), -- dealer who approved
    
    rejected_at TIMESTAMP,
    rejected_by UUID REFERENCES users(id),
    rejection_reason TEXT,
    
    fulfilled_at TIMESTAMP,
    
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    
    -- Link to actual transaction (once approved)
    transaction_id UUID REFERENCES transactions(id),
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX idx_order_requests_subdealer ON order_requests(subdealer_id);
CREATE INDEX idx_order_requests_dealer ON order_requests(dealer_id);
CREATE INDEX idx_order_requests_status ON order_requests(status);
CREATE INDEX idx_order_requests_date ON order_requests(request_date DESC);
```

### 4. NEW: Order Request Items Table
```sql
CREATE TABLE order_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    order_request_id UUID REFERENCES order_requests(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2),
    total_price DECIMAL(10, 2),
    
    -- Snapshot at time of request
    product_snapshot JSONB, -- {name, brand, dimensions, image_url}
    
    -- Availability check at time of request
    available_quantity INT, -- what was in stock when requested
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_order_request_items_request ON order_request_items(order_request_id);
CREATE INDEX idx_order_request_items_product ON order_request_items(product_id);
```

### 5. NEW: Access Logs (Track who views what)
```sql
CREATE TABLE inventory_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    subdealer_id UUID REFERENCES users(id) NOT NULL,
    dealer_id UUID REFERENCES merchants(id) NOT NULL,
    product_id UUID REFERENCES products(id),
    
    action VARCHAR(50), -- 'view_list', 'view_detail', 'search', 'add_to_cart'
    
    accessed_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB -- search terms, filters, etc.
);

CREATE INDEX idx_access_logs_subdealer ON inventory_access_logs(subdealer_id);
CREATE INDEX idx_access_logs_dealer ON inventory_access_logs(dealer_id);
CREATE INDEX idx_access_logs_product ON inventory_access_logs(product_id);
CREATE INDEX idx_access_logs_time ON inventory_access_logs(accessed_at DESC);
```

### 6. Updated Transactions Table
```sql
-- Add these fields to existing transactions table:
ALTER TABLE transactions
ADD COLUMN transaction_type VARCHAR(20), -- 'dealer_purchase', 'subdealer_order', 'adjustment', 'return'
ADD COLUMN subdealer_id UUID REFERENCES users(id), -- if order from sub-dealer
ADD COLUMN order_request_id UUID REFERENCES order_requests(id); -- link to original request
```

---

## API Endpoints (Enhanced)

### Sub-Dealer Management

#### For Sub-dealers:
```
POST   /api/subdealers/register              # Register as sub-dealer
POST   /api/subdealers/request-access        # Request access to a dealer
GET    /api/subdealers/my-dealers            # List dealers I have access to
GET    /api/subdealers/inventory             # Search across all accessible inventories
POST   /api/subdealers/orders/request        # Place order request
GET    /api/subdealers/orders                # My order requests
GET    /api/subdealers/orders/{id}           # Order request detail
PUT    /api/subdealers/orders/{id}/cancel    # Cancel order request
```

#### For Dealers:
```
GET    /api/dealers/subdealer-requests       # Pending access requests
POST   /api/dealers/subdealer-requests/{id}/approve
POST   /api/dealers/subdealer-requests/{id}/reject
GET    /api/dealers/subdealers               # My approved sub-dealers
PUT    /api/dealers/subdealers/{id}/revoke   # Revoke access
GET    /api/dealers/order-requests           # Incoming order requests
GET    /api/dealers/order-requests/{id}      # Order request detail
POST   /api/dealers/order-requests/{id}/approve
POST   /api/dealers/order-requests/{id}/reject
GET    /api/dealers/analytics/subdealers     # Sub-dealer analytics
```

### Enhanced Product Search (for Sub-dealers)
```
GET /api/products/search-multi-dealer        # Search across multiple dealers
  Query params:
    - search: "12x12 beige"
    - brand: "Kajaria"
    - min_price: 400
    - max_price: 600
    - min_quantity: 50
    - dealer_ids: [uuid1, uuid2]  # optional: specific dealers
    - sort_by: price|availability|distance
```

---

## User Flows

### Flow 1: Sub-dealer Requests Access to Dealer

```
1. Sub-dealer finds Dealer A in platform
2. Clicks "Request Access"
3. Fills form: Business details, GST, reason for access
4. System creates record in dealer_subdealer_permissions (status: pending)
5. Dealer A gets notification
6. Dealer A reviews sub-dealer profile
7. Dealer A approves/rejects
   - If approved: status → 'active', sub-dealer can now see inventory
   - If rejected: status → 'rejected', notification sent
```

### Flow 2: Sub-dealer Places Order

```
1. Sub-dealer searches: "12x12 glossy tiles"
2. Sees results from multiple dealers (filtered by permission)
3. Selects product from Dealer B
4. Adds to cart, enters quantity
5. Submits order request
6. System:
   - Creates order_request record (status: pending)
   - Creates order_request_items
   - Checks product availability
   - Calculates total
   - Sends notification to Dealer B
7. Dealer B receives notification
8. Dealer B reviews order request
9. Dealer B approves:
   - order_request.status → 'approved'
   - Creates actual transaction
   - Updates inventory (quantity decreases)
   - Sends confirmation to sub-dealer
10. Sub-dealer receives confirmation
```

### Flow 3: Dealer Manages Sub-dealer Permissions

```
Dealer Dashboard → Sub-dealers Section

View:
- Pending requests (3)
- Active sub-dealers (15)
- Revoked access (2)

For each sub-dealer:
- Business name
- Location
- Total orders placed
- Total order value
- Last order date
- Actions: View Profile, Revoke Access

Analytics:
- Which sub-dealers order most?
- Which products do they prefer?
- Revenue from sub-dealers
```

---

## Analytics Enhancements

### New Analytics Dimensions:

#### For Dealers:
```
Sub-dealer Performance:
- Top sub-dealers by order volume
- Sub-dealer acquisition funnel (requests → approvals → orders)
- Revenue by sub-dealer
- Popular products among sub-dealers

Network Analytics:
- How many sub-dealers viewing inventory?
- Conversion rate: views → orders
- Average order value from sub-dealers
```

#### For Sub-dealers:
```
Dealer Comparison:
- Which dealer has best prices?
- Which dealer has most inventory?
- Which dealer fulfills fastest?
- Dealer ratings/performance

Purchase Analytics:
- My top purchased products
- My spending trends
- Best deals found
```

#### For Platform Owner (You):
```
Marketplace Health:
- Total dealers
- Total sub-dealers
- Connection density (avg connections per dealer)
- Order request conversion rate
- GMV (Gross Merchandise Value)
- Network growth rate

Predictive Insights:
- Which sub-dealers likely to churn?
- Which dealer-subdealer pairs likely to transact?
- Demand forecasting aggregated across network
```

---

## UI/UX Enhancements

### Dealer Dashboard:
```
┌─────────────────────────────────────────────┐
│  Dealer Dashboard                           │
├─────────────────────────────────────────────┤
│  📊 Overview                                │
│  │  Revenue: ₹5.2L                         │
│  │  Orders: 45 (↑12%)                      │
│  │  Sub-dealers: 8 active                  │
│                                             │
│  🔔 Notifications                           │
│  │  • 3 new access requests                │
│  │  • 2 pending order requests             │
│                                             │
│  👥 Sub-dealers                             │
│  │  Pending Requests (3)                   │
│  │  Active (8) | Manage | View Analytics  │
│                                             │
│  📦 Inventory                               │
│  🛒 Orders                                  │
│  📈 Analytics                               │
└─────────────────────────────────────────────┘
```

### Sub-dealer Dashboard:
```
┌─────────────────────────────────────────────┐
│  Sub-dealer Dashboard                       │
├─────────────────────────────────────────────┤
│  🔍 Search Inventory                        │
│  │  [Search across 5 dealers...]           │
│  │  Filters: Brand, Size, Price, Location  │
│                                             │
│  📊 My Connections                          │
│  │  Connected Dealers: 5                   │
│  │  Pending Requests: 2                    │
│  │  [+ Request Access to New Dealer]       │
│                                             │
│  🛒 My Orders                               │
│  │  Pending: 2                             │
│  │  Approved: 15                           │
│  │  Fulfilled: 98                          │
│                                             │
│  💡 Recommendations                         │
│  │  "Dealer X has 20% discount on Y"      │
└─────────────────────────────────────────────┘
```

---

## Business Model Implications

### Revenue Streams (for you):

1. **Commission on Orders**
   - Take 2-5% on each transaction between dealer and sub-dealer

2. **Subscription Tiers**
   - Dealers:
     - Free: Up to 5 sub-dealers
     - Pro: Unlimited sub-dealers + analytics
   - Sub-dealers:
     - Free: Connect to 3 dealers
     - Pro: Unlimited connections + priority support

3. **Premium Features**
   - Advanced analytics
   - API access
   - Custom integrations
   - Priority order processing

4. **Advertising**
   - Dealers pay to promote products to sub-dealers
   - Featured dealer listings

---

## Security & Privacy

### Permission Enforcement:

```python
def can_subdealer_view_dealer_inventory(subdealer_id, dealer_id):
    permission = get_permission(subdealer_id, dealer_id)
    return permission.status == 'active'

def filter_products_for_subdealer(subdealer_id, products):
    # Only show products from dealers that granted access
    accessible_dealers = get_accessible_dealers(subdealer_id)
    return products.filter(merchant_id__in=accessible_dealers)
```

### Data Privacy:
- Dealers control what sub-dealers see
- Option to hide prices until order request
- Option to hide certain products
- Audit trail of all access

---

## Next Steps

### Immediate Updates Needed:

1. **Database Migration:**
   - Add new tables
   - Update users table with user_type
   - Add indexes

2. **API Endpoints:**
   - Implement sub-dealer registration
   - Implement permission management
   - Implement order request flow

3. **UI Components:**
   - Sub-dealer dashboard
   - Dealer permission management UI
   - Order request interface
   - Multi-dealer product search

4. **Business Logic:**
   - Permission checking middleware
   - Order request approval workflow
   - Inventory visibility logic

---

**This is HUGE! This transforms SupplySync from a simple inventory system into a full B2B marketplace! 🚀**

Should I update the implementation to include this feature?
