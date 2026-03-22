# SupplySync.in API Documentation

## Base URL
- Production: `https://your-domain.com`
- Local: `http://localhost:8001`

All API routes are prefixed with `/api`

---

## Authentication

### Register Dealer
**POST** `/api/auth/register/dealer`

Register a new dealer account.

**Request Body:**
```json
{
  "username": "dealer1",
  "email": "dealer@example.com",
  "phone": "9876543210",
  "password": "securepassword",
  "merchant_name": "My Tile Shop"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "username": "dealer1",
    "email": "dealer@example.com",
    "user_type": "dealer"
  }
}
```

---

### Login
**POST** `/api/auth/login`

Login with email and password.

**Request Body:**
```json
{
  "email": "dealer@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "user": { ... }
}
```

---

## Universal Search

### Search Everything
**GET** `/api/dealer/search?q={query}`

Search across all sub-categories and products. Minimum 2 characters required.

**Query Parameters:**
- `q` (required): Search query string

**Response:**
```json
{
  "subcategories": [
    {
      "id": "uuid",
      "name": "12X12 DOUBLE CHARGE",
      "size": "12x12",
      "size_inches": "12 x 12",
      "size_mm": "300mm x 300mm",
      "make_type": "Double Charge",
      "product_count": 5,
      "type": "subcategory"
    }
  ],
  "products": [
    {
      "id": "uuid",
      "brand": "Kajaria",
      "name": "Premium Glossy",
      "sku": "KAJ-001",
      "surface_type": "Glossy",
      "quality": "Premium",
      "current_quantity": 50,
      "subcategory_id": "uuid",
      "subcategory_name": "12X12 DOUBLE CHARGE",
      "type": "product"
    }
  ],
  "total_results": 6
}
```

**Search Fields:**
- **Sub-categories**: name, size, size_mm, make_type
- **Products**: brand, name, sku, surface_type, quality

---

## Dashboard

### Get Dashboard Stats
**GET** `/api/dealer/dashboard-stats`

Get dealer dashboard statistics.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "total_products": 15,
  "low_stock_items": 3,
  "out_of_stock": 1,
  "inventory_value": 0
}
```

**Note:** `inventory_value` is 0 until pricing is implemented.

---

## Sub-Categories

### List Sub-Categories
**GET** `/api/dealer/subcategories`

Get all tile sub-categories with product counts for the dealer.

**Response:**
```json
{
  "subcategories": [
    {
      "id": "uuid",
      "name": "12X12 DOUBLE CHARGE",
      "size": "12 x 12",
      "size_id": "uuid-or-null",
      "size_inches": "12 x 12",
      "size_mm": "300mm x 300mm",
      "make_type": "Double Charge",
      "product_count": 5,
      "total_quantity": 0
    }
  ]
}
```

---

### Create Sub-Category
**POST** `/api/dealer/subcategories`

Create or get existing sub-category (smart logic).

**Request Body:**

- **`application_type_id`** (required): UUID from `GET /reference/application-types`.
- **`size_id`** (preferred) or **`size`** string (e.g. `"12x12"`).
- **`make_type_id`** (optional): if set, **`body_type_id`** is taken from the make type when it has a linked body; if the make type has no body link, send **`body_type_id`** explicitly.
- If **`make_type_id`** is omitted, **`body_type_id`** is required.
- **`default_packing_per_box`** (optional): positive int; otherwise uses the tile size’s default from admin or `10`.

```json
{
  "size_id": "uuid",
  "application_type_id": "uuid",
  "make_type_id": "uuid",
  "default_packing_per_box": 4
}
```

**Response:** `subcategory` includes `application_type_id`, `body_type_id`, `application_type`, `body_type`, `default_packing_per_box`, `make_type_id`, `make_type`, display sizes, etc.

**Smart Logic:** Uniqueness is per **tiles category + size + make_type** (when make type is set) or **tiles category + size** when **no** make type (partial unique indexes). If an existing row matches, `exists: true`. Existing `size_id` may still be backfilled when applicable.

---

## Products

### List Products in Sub-Category
**GET** `/api/dealer/subcategories/{subcategory_id}/products`

Get all products under a specific sub-category for the dealer.

**Response:**
```json
{
  "subcategory": {
    "id": "uuid",
    "name": "12X12 DOUBLE CHARGE",
    "size": "12 x 12",
    "size_id": "uuid-or-null",
    "size_inches": "12 x 12",
    "size_mm": "300mm x 300mm",
    "make_type": "Double Charge"
  },
  "products": [
    {
      "id": "uuid",
      "brand": "Kajaria",
      "name": "Premium Glossy",
      "sku": null,
      "surface_type": "Glossy",
      "application_type": "Wall",
      "body_type": "Vitrified",
      "quality": "Premium",
      "current_quantity": 50,
      "packing_per_box": 10,
      "primary_image_url": null
    }
  ]
}
```

---

### Create Product
**POST** `/api/dealer/products`

Create a new product under a sub-category.

**Request Body:**
```json
{
  "sub_category_id": "uuid",
  "brand": "Kajaria",
  "name": "Premium Glossy",
  "surface_type_id": "uuid",
  "application_type_id": "uuid",
  "body_type_id": "uuid",
  "quality_id": "uuid",
  "current_quantity": 50,
  "packing_per_box": 10,
  "sku": "KAJ-001"
}
```

`application_type_id`, `body_type_id`, and `packing_per_box` may be **omitted** when the sub-category has defaults; the API fills them from the sub-category.

**Response:**
```json
{
  "message": "Product 'Kajaria Premium Glossy' created successfully",
  "product": {
    "id": "uuid",
    "brand": "Kajaria",
    "name": "Premium Glossy",
    "quantity": 50
  }
}
```

**Validation:**
- Prevents duplicate products (same merchant + subcategory + brand + name)

---

## Product Transactions

### Create Transaction
**POST** `/api/dealer/products/{product_id}/transactions`

Add or subtract quantity from a product.

**Request Body:**
```json
{
  "transaction_type": "add",  // or "subtract"
  "quantity": 10,              // must be positive integer
  "notes": "Received new stock" // optional
}
```

**Response:**
```json
{
  "message": "Transaction successful: add 10 boxes",
  "transaction": {
    "id": "uuid",
    "type": "add",
    "quantity": 10,
    "quantity_before": 50,
    "quantity_after": 60,
    "created_at": "2026-03-04T10:30:00Z"
  },
  "product": {
    "id": "uuid",
    "current_quantity": 60
  }
}
```

**Validation:**
- `transaction_type` must be "add" or "subtract"
- `quantity` must be a positive integer
- Allows negative final quantities (for tracking out-of-stock)

**Use Cases:**
- **ADD**: Receiving new stock, returns, corrections
- **SUBTRACT**: Sales, damages, transfers, corrections

---

### Get Transaction History
**GET** `/api/dealer/products/{product_id}/transactions?limit=50`

Get transaction history for a product.

**Query Parameters:**
- `limit` (optional): Max results, default 50

**Response:**
```json
{
  "product": {
    "id": "uuid",
    "brand": "Kajaria",
    "name": "Premium Glossy",
    "current_quantity": 60
  },
  "transactions": [
    {
      "id": "uuid",
      "transaction_type": "add",
      "quantity": 10,
      "quantity_before": 50,
      "quantity_after": 60,
      "notes": "Received new stock",
      "created_at": "2026-03-04T10:30:00Z",
      "created_by": "dealer1"
    }
  ],
  "total_count": 5
}
```

**Sorted By:** Most recent first

---

## Reference Data

All reference data endpoints return master lists used for dropdowns and validation.

### Get Sizes
**GET** `/api/reference/sizes`

Returns all tile sizes.

**Response:**
```json
{
  "sizes": [
    {
      "id": "uuid",
      "name": "12x12",
      "height_inches": "12",
      "width_inches": "12",
      "height_mm": 304,
      "width_mm": 304
    }
  ]
}
```

---

### Get Make Types
**GET** `/api/reference/make-types`

Returns all tile make types (GVT, Double Charge, etc.)

---

### Get Surface Types
**GET** `/api/reference/surface-types`

Returns all surface types (Glossy, Matt, etc.)

---

### Get Application Types
**GET** `/api/reference/application-types`

Returns all application types (Floor, Wall, Both)

---

### Get Body Types
**GET** `/api/reference/body-types`

Returns all body types (Vitrified, Ceramic, etc.)

---

### Get Qualities
**GET** `/api/reference/qualities`

Returns all quality levels (Premium, Standard, Economy)

---

## Error Responses

All endpoints return standard error responses:

**400 Bad Request:**
```json
{
  "detail": "quantity must be a positive integer"
}
```

**401 Unauthorized:**
```json
{
  "detail": "Not authenticated"
}
```

**403 Forbidden:**
```json
{
  "detail": "Only dealers can access this endpoint"
}
```

**404 Not Found:**
```json
{
  "detail": "Product not found"
}
```

**500 Internal Server Error:**
```json
{
  "detail": "Internal server error"
}
```

---

## Rate Limiting

Currently no rate limiting implemented. Will be added in future versions.

---

## Pagination

Currently not implemented. All list endpoints return full results. Will be added when datasets grow larger.

---

## Authentication Flow

1. Register via `/api/auth/register/dealer`
2. Login via `/api/auth/login` to get JWT token
3. Include token in all subsequent requests:
   ```
   Authorization: Bearer {token}
   ```
4. Token expires after 30 days (43200 minutes)

---

## Database Schema Notes

- **Shared Sub-Categories**: Sub-categories are shared across all merchants. Defined by unique combination of size + make_type.
- **Merchant-Specific Products**: Each product belongs to one merchant.
- **Transaction Logging**: All quantity changes are permanently logged in `product_transactions` table for audit trail and analytics.
- **No Pricing Yet**: Price fields intentionally omitted until Phase 2.

---

## Future Endpoints (Planned)

- `PUT /api/dealer/products/{id}` - Update product
- `DELETE /api/dealer/products/{id}` - Delete product
- `POST /api/dealer/products/{id}/images` - Upload images
- `GET /api/dealer/analytics` - Transaction analytics
- `GET /api/dealer/low-stock` - Low stock alerts

---

**Last Updated:** March 4, 2026  
**Version:** 1.0
