# SupplySync Database Schema Documentation

## Overview

The SupplySync database uses **PostgreSQL** with a normalized schema designed for a B2B tile/flooring marketplace. The architecture supports:
- Multi-tenant (multiple merchants/dealers)
- Shared product categorization
- Complete audit trails
- Scalability for future features

---

## Entity Relationship Diagram (ERD)

```
┌─────────────┐
│  categories │
│             │
│ - id (PK)   │
│ - name      │
│ - slug      │
└──────┬──────┘
       │ 1
       │
       │ N
┌──────┴────────────┐         ┌──────────────┐
│  sub_categories   │ N     1 │  make_types  │
│                   ├─────────┤              │
│ - id (PK)         │         │ - id (PK)    │
│ - category_id(FK) │         │ - name       │
│ - size            │         └──────────────┘
│ - make_type_id(FK)│
│ - height_inches   │
│ - width_inches    │
│ - height_mm       │
│ - width_mm        │
└────────┬──────────┘
         │ 1
         │
         │ N
┌────────┴──────────────┐       ┌──────────────┐
│      products         │ N   1 │  merchants   │
│                       ├───────┤              │
│ - id (PK)             │       │ - id (PK)    │
│ - merchant_id (FK)    │       │ - name       │
│ - sub_category_id(FK) │       │ - owner_id   │
│ - brand               │       └──────────────┘
│ - name                │              │
│ - surface_type_id(FK) │              │ 1
│ - application_type_id │              │
│ - body_type_id (FK)   │              │ 1
│ - quality_id (FK)     │       ┌──────┴───────┐
│ - current_quantity    │       │    users     │
│ - packing_per_box     │       │              │
└───────┬───────────────┘       │ - id (PK)    │
        │ 1                     │ - email      │
        │                       │ - username   │
        │ N                     │ - user_type  │
┌───────┴─────────────────┐     └──────┬───────┘
│  product_transactions   │            │ 1
│                         │            │
│ - id (PK)               │            │ N
│ - product_id (FK)       ├────────────┘
│ - merchant_id (FK)      │
│ - user_id (FK)          │
│ - transaction_type      │
│ - quantity              │
│ - quantity_before       │
│ - quantity_after        │
│ - notes                 │
│ - created_at            │
└─────────────────────────┘
```

---

## Core Tables

### 1. users
**Purpose:** Store all user accounts (dealers, sub-dealers, admins)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique user identifier |
| email | VARCHAR(255) | Unique email address |
| username | VARCHAR(100) | Display name |
| phone | VARCHAR(20) | Contact number |
| hashed_password | TEXT | Bcrypt hashed password |
| user_type | VARCHAR(20) | 'dealer', 'subdealer', 'admin' |
| merchant_id | UUID (FK) | Reference to merchants table |
| is_active | BOOLEAN | Account status |
| created_at | TIMESTAMP | Account creation time |

**Indexes:**
- `idx_users_email` on `email`
- `idx_users_merchant` on `merchant_id`

**Constraints:**
- UNIQUE(email)
- CHECK(user_type IN ('dealer', 'subdealer', 'admin'))

---

### 2. merchants
**Purpose:** Business entities (shops, warehouses)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique merchant identifier |
| business_name | VARCHAR(255) | Shop/business name |
| owner_id | UUID (FK) | Primary user (dealer) |
| gstin | VARCHAR(50) | GST identification (optional) |
| address | TEXT | Business address |
| city | VARCHAR(100) | City |
| state | VARCHAR(100) | State |
| pincode | VARCHAR(10) | Postal code |
| is_active | BOOLEAN | Business status |
| created_at | TIMESTAMP | Registration time |

**Indexes:**
- `idx_merchants_owner` on `owner_id`

---

### 3. categories
**Purpose:** Top-level product categories (admin-managed)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique category identifier |
| name | VARCHAR(100) | Display name (e.g., "Tiles") |
| slug | VARCHAR(100) | URL-friendly name |
| description | TEXT | Category description |
| icon | VARCHAR(50) | Icon identifier |
| is_active | BOOLEAN | Visibility status |
| display_order | INT | Sort order |
| created_at | TIMESTAMP | Creation time |

**Current Data:**
- Tiles (primary focus)
- Sanitary (future)
- Plywood (future)
- Laminates (future)

---

### 4. sub_categories
**Purpose:** Shared product sub-categories across all merchants

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| category_id | UUID (FK) | Parent category |
| name | VARCHAR(255) | Generated name (e.g., "12X12 DOUBLE CHARGE") |
| size | VARCHAR(50) | Display size (e.g., "12x12") |
| make_type_id | UUID (FK) | Tile make type |
| height_inches | VARCHAR(10) | Height in inches |
| width_inches | VARCHAR(10) | Width in inches |
| height_mm | INT | Height in millimeters |
| width_mm | INT | Width in millimeters |
| is_active | BOOLEAN | Availability status |
| created_at | TIMESTAMP | Creation time |

**Key Design:**
- **Shared across all merchants** - prevents duplicate sub-categories
- **UNIQUE constraint** on (category_id, make_type_id, height_mm, width_mm)
- Name is auto-generated from size + make_type

**Indexes:**
- `idx_subcategories_category` on `category_id`
- `idx_subcategories_make_type` on `make_type_id`

---

### 5. products
**Purpose:** Merchant-specific inventory items

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique product identifier |
| merchant_id | UUID (FK) | Owner merchant |
| sub_category_id | UUID (FK) | Product category |
| brand | VARCHAR(100) | Brand name (e.g., "Kajaria") |
| name | VARCHAR(255) | Product name |
| sku | VARCHAR(100) | Stock keeping unit (optional) |
| surface_type_id | UUID (FK) | Surface finish |
| application_type_id | UUID (FK) | Usage type (floor/wall) |
| body_type_id | UUID (FK) | Tile body type |
| quality_id | UUID (FK) | Quality grade |
| current_quantity | INT | Stock on hand |
| packing_per_box | INT | Pieces per box |
| primary_image_url | TEXT | Main product image |
| is_active | BOOLEAN | Product status |
| created_at | TIMESTAMP | Addition time |
| updated_at | TIMESTAMP | Last modification |

**Key Design:**
- Each product belongs to ONE merchant
- Multiple merchants can have products in the same sub-category
- **UNIQUE constraint** on (merchant_id, sub_category_id, brand, name)

**Indexes:**
- `idx_products_merchant` on `merchant_id`
- `idx_products_sub_category` on `sub_category_id`
- `idx_products_brand` on `brand`
- `idx_products_active` on `is_active`

---

### 6. product_transactions
**Purpose:** Complete audit trail of all quantity changes

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique transaction ID |
| product_id | UUID (FK) | Product affected |
| merchant_id | UUID (FK) | Merchant (for filtering) |
| user_id | UUID (FK) | User who made change |
| transaction_type | VARCHAR(20) | 'add' or 'subtract' |
| quantity | INT | Amount changed (always positive) |
| quantity_before | INT | Stock before transaction |
| quantity_after | INT | Stock after transaction |
| notes | TEXT | Optional comment |
| created_at | TIMESTAMP | Transaction time |

**Key Design:**
- **Immutable** - records are never updated or deleted
- Enables full audit trail and analytics
- Supports negative quantities (for out-of-stock tracking)

**Indexes:**
- `idx_transactions_product` on `product_id`
- `idx_transactions_merchant` on `merchant_id`
- `idx_transactions_created` on `created_at DESC`

**Constraints:**
- CHECK(transaction_type IN ('add', 'subtract'))
- CHECK(quantity > 0) - transaction quantity must be positive

---

## Reference Tables

These tables store master data used for dropdowns and validation.

### sizes
Tile dimensions (e.g., 12x12, 24x24)

| Column | Type |
|--------|------|
| id | UUID (PK) |
| name | VARCHAR(50) |
| height_inches | VARCHAR(10) |
| width_inches | VARCHAR(10) |
| height_mm | INT |
| width_mm | INT |
| is_active | BOOLEAN |
| display_order | INT |

---

### make_types
Manufacturing/processing types

| Column | Type |
|--------|------|
| id | UUID (PK) |
| name | VARCHAR(100) |
| description | TEXT |
| is_active | BOOLEAN |
| display_order | INT |

**Examples:** GVT, Double Charge, HD, Satin Matt, PGVT

---

### surface_types
Surface finishes

| Column | Type |
|--------|------|
| id | UUID (PK) |
| name | VARCHAR(100) |
| is_active | BOOLEAN |
| display_order | INT |

**Examples:** Glossy, Matt, Rustic, Wooden, Metallic

---

### application_types
Usage locations

| Column | Type |
|--------|------|
| id | UUID (PK) |
| name | VARCHAR(100) |
| is_active | BOOLEAN |
| display_order | INT |

**Examples:** Floor, Wall, Both

---

### body_types
Tile material/body types

| Column | Type |
|--------|------|
| id | UUID (PK) |
| name | VARCHAR(100) |
| is_active | BOOLEAN |
| display_order | INT |

**Examples:** Vitrified, Ceramic, Porcelain

---

### qualities
Quality grades

| Column | Type |
|--------|------|
| id | UUID (PK) |
| name | VARCHAR(100) |
| is_active | BOOLEAN |
| display_order | INT |

**Examples:** Premium, Standard, Economy

---

## Key Relationships

1. **One Category → Many Sub-Categories**
   - Categories (Tiles) contain multiple sub-categories (12x12 GVT, 24x24 HD)

2. **One Sub-Category → Many Products**
   - Multiple merchants can have products in same sub-category
   - Sub-categories are shared across merchants

3. **One Merchant → Many Products**
   - Each merchant maintains their own product inventory

4. **One Product → Many Transactions**
   - Every quantity change is logged
   - Enables complete audit trail

5. **One User → One Merchant**
   - Each dealer user belongs to one merchant
   - Future: sub-dealers can access multiple merchants

---

## Data Integrity

### Foreign Key Constraints
All foreign keys use `ON DELETE` rules:
- `product_transactions` → `products`: CASCADE (delete transactions with product)
- `products` → `sub_categories`: RESTRICT (can't delete sub-category with products)
- `products` → `merchants`: CASCADE (delete products with merchant)

### Check Constraints
- `transaction_type` must be 'add' or 'subtract'
- `quantity` in transactions must be positive
- `user_type` must be valid role
- Email format validation

### Unique Constraints
- Users: email
- Sub-categories: (category_id, make_type_id, height_mm, width_mm)
- Products: (merchant_id, sub_category_id, brand, name)

---

## Indexes Strategy

**Performance Optimization:**
1. Foreign keys are indexed for JOIN performance
2. Frequently filtered columns (is_active, email) are indexed
3. Timestamp columns used in sorting are indexed DESC
4. Search-heavy columns (brand, name) have indexes

---

## Future Schema Changes

### Phase 2
- Add `products.price` column
- Add `product_images` table (already defined, not used yet)
- Add `inventory_logs` table for additional tracking

### Phase 3
- Add `orders` table
- Add `order_items` table
- Add `subdealer_merchant_access` junction table

### Phase 4
- Add `analytics_snapshots` table
- Add `price_history` table
- Add `promotions` table

---

## Migration Notes

**Applying Schema:**
```bash
sudo -u postgres psql -d supplysync -f init_db.sql
sudo -u postgres psql -d supplysync -f schema_v2.sql
sudo -u postgres psql -d supplysync -f seed_data.sql
sudo -u postgres psql -d supplysync -f add_sizes_table.sql
```

**Backup:**
```bash
pg_dump -U postgres supplysync > backup.sql
```

**Restore:**
```bash
psql -U postgres supplysync < backup.sql
```

---

## Query Examples

### Get products with full details:
```sql
SELECT 
  p.brand,
  p.name,
  p.current_quantity,
  sc.name as category,
  st.name as surface,
  q.name as quality
FROM products p
JOIN sub_categories sc ON p.sub_category_id = sc.id
JOIN surface_types st ON p.surface_type_id = st.id
JOIN qualities q ON p.quality_id = q.id
WHERE p.merchant_id = 'merchant-uuid'
AND p.is_active = TRUE;
```

### Get transaction history:
```sql
SELECT 
  pt.transaction_type,
  pt.quantity,
  pt.quantity_before,
  pt.quantity_after,
  pt.created_at,
  u.username
FROM product_transactions pt
JOIN users u ON pt.user_id = u.id
WHERE pt.product_id = 'product-uuid'
ORDER BY pt.created_at DESC
LIMIT 50;
```

---

**Last Updated:** March 4, 2026  
**Schema Version:** 2.0
