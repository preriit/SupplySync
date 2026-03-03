# SupplySync Intelligence Platform - Technical Architecture

## Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL (with TimescaleDB extension for time-series)
- **ORM**: SQLAlchemy 2.0
- **ML/AI**: 
  - scikit-learn (preprocessing, basic ML)
  - prophet (time-series forecasting)
  - tensorflow/pytorch (deep learning for CV)
  - transformers (if needed for NLP)
- **Computer Vision**:
  - OpenCV (image processing)
  - PIL/Pillow (image manipulation)
  - torchvision (pre-trained models)
- **Vector Database**: 
  - FAISS (for visual similarity search)
  - Or Pinecone (cloud alternative)
- **Caching**: Redis
- **Task Queue**: Celery (for async ML processing)
- **API Docs**: Auto-generated with FastAPI

### Frontend
- **Framework**: React 19
- **UI Library**: shadcn/ui + Tailwind CSS
- **Charts**: Recharts / Victory
- **State Management**: React Query + Context
- **Routing**: React Router v7

### Infrastructure
- **Containerization**: Docker
- **Process Manager**: Supervisor (already in place)
- **Web Server**: Nginx (reverse proxy)
- **Storage**: AWS S3 (for images)
- **Monitoring**: (to be added)

---

## Database Schema Design

### Core Tables (Enhanced for Analytics)

```sql
-- MERCHANTS
CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address JSONB, -- {address1, address2, city, state, country, postal_code}
    gst_number VARCHAR(20),
    pan VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB -- flexible additional data
);

-- USERS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255),
    merchant_id UUID REFERENCES merchants(id),
    role VARCHAR(20), -- 'admin', 'manager', 'viewer'
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    metadata JSONB
);

-- CATEGORIES
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id),
    name VARCHAR(255) NOT NULL,
    dimensions JSONB, -- {height_inches, width_inches, height_mm, width_mm}
    make_type VARCHAR(100), -- 'GVT', 'PGVT', etc.
    application_type VARCHAR(100), -- 'Floor', 'Wall', etc.
    body_type VARCHAR(100), -- 'Vitrified', 'Ceramic', etc.
    quality VARCHAR(100), -- 'Premium', 'Standard', etc.
    default_packing_per_box INT,
    created_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);

-- PRODUCTS (Enhanced with analytics fields)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id),
    category_id UUID REFERENCES categories(id),
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    sku VARCHAR(100) UNIQUE, -- Stock Keeping Unit
    
    -- Physical attributes
    dimensions JSONB, -- inherited from category
    surface_type VARCHAR(50), -- 'Glossy', 'Matte', 'Rough'
    packing_per_box INT,
    
    -- Current inventory
    current_quantity INT DEFAULT 0,
    
    -- Pricing (NEW!)
    current_price DECIMAL(10, 2),
    cost_price DECIMAL(10, 2), -- for margin analysis
    
    -- Image analysis results (NEW!)
    primary_image_url TEXT,
    image_embeddings VECTOR(512), -- for visual similarity (pgvector extension)
    dominant_colors JSONB, -- [{color: '#hexcode', percentage: 0.45}, ...]
    color_palette JSONB, -- extracted color palette
    detected_patterns JSONB, -- ['geometric', 'floral', ...]
    style_classification JSONB, -- {modern: 0.8, traditional: 0.15, ...}
    auto_tags TEXT[], -- automatically generated tags
    
    -- Analytics metadata
    popularity_score FLOAT, -- computed metric
    total_sales INT DEFAULT 0,
    total_revenue DECIMAL(12, 2) DEFAULT 0,
    avg_rating FLOAT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_sold_at TIMESTAMP,
    
    metadata JSONB
);

-- PRODUCT IMAGES
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    ordering INT,
    image_analysis JSONB, -- results from CV pipeline
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- SALES TRANSACTIONS (NEW - CRITICAL FOR ANALYTICS!)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id),
    transaction_type VARCHAR(20), -- 'sale', 'purchase', 'return', 'adjustment'
    
    -- Transaction details
    transaction_date TIMESTAMP DEFAULT NOW(),
    reference_number VARCHAR(100), -- invoice number, PO number, etc.
    
    -- Customer info (optional - for future use)
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_address JSONB,
    
    -- Financial
    subtotal DECIMAL(10, 2),
    tax_amount DECIMAL(10, 2),
    discount_amount DECIMAL(10, 2),
    total_amount DECIMAL(10, 2),
    
    -- Status
    status VARCHAR(20), -- 'pending', 'completed', 'cancelled'
    payment_status VARCHAR(20), -- 'paid', 'unpaid', 'partial'
    
    -- User who created transaction
    created_by UUID REFERENCES users(id),
    
    created_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);

-- TRANSACTION ITEMS (Line items for each transaction)
CREATE TABLE transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2),
    total_price DECIMAL(10, 2),
    
    -- Snapshot of product details at time of sale
    product_snapshot JSONB, -- {name, brand, dimensions, etc.}
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- INVENTORY LOGS (Track all quantity changes)
CREATE TABLE inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    transaction_id UUID REFERENCES transactions(id), -- link to transaction if applicable
    
    change_type VARCHAR(20), -- 'sale', 'purchase', 'adjustment', 'return'
    quantity_change INT, -- positive or negative
    quantity_before INT,
    quantity_after INT,
    
    reason TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- PRICING HISTORY (NEW - Track price changes over time)
CREATE TABLE pricing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    
    old_price DECIMAL(10, 2),
    new_price DECIMAL(10, 2),
    change_reason VARCHAR(255), -- 'market_adjustment', 'promotion', 'cost_increase'
    
    effective_from TIMESTAMP DEFAULT NOW(),
    effective_to TIMESTAMP,
    
    changed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ANALYTICS CACHE (Pre-computed metrics for fast dashboard loading)
CREATE TABLE analytics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(255) UNIQUE,
    cache_type VARCHAR(50), -- 'daily_sales', 'product_performance', etc.
    data JSONB,
    computed_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- ML PREDICTIONS (Store model predictions)
CREATE TABLE predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_type VARCHAR(50), -- 'demand_forecast', 'price_optimization', etc.
    entity_type VARCHAR(50), -- 'product', 'category', 'merchant'
    entity_id UUID,
    
    model_name VARCHAR(100),
    model_version VARCHAR(50),
    
    prediction_data JSONB, -- the actual prediction results
    confidence_score FLOAT,
    
    prediction_for_date DATE, -- what date is this prediction for?
    created_at TIMESTAMP DEFAULT NOW()
);

-- TAGS (for flexible categorization)
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE,
    tag_type VARCHAR(50), -- 'color', 'style', 'use_case', etc.
    created_at TIMESTAMP DEFAULT NOW()
);

-- PRODUCT_TAGS (many-to-many)
CREATE TABLE product_tags (
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    confidence FLOAT, -- if auto-generated, how confident?
    is_auto_generated BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (product_id, tag_id)
);
```

---

## Indexes for Performance

```sql
-- Products
CREATE INDEX idx_products_merchant ON products(merchant_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_popularity ON products(popularity_score DESC);

-- Transactions
CREATE INDEX idx_transactions_merchant ON transactions(merchant_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);

-- Transaction Items
CREATE INDEX idx_transaction_items_product ON transaction_items(product_id);
CREATE INDEX idx_transaction_items_transaction ON transaction_items(transaction_id);

-- Inventory Logs
CREATE INDEX idx_inventory_logs_product ON inventory_logs(product_id);
CREATE INDEX idx_inventory_logs_created ON inventory_logs(created_at);

-- Pricing History
CREATE INDEX idx_pricing_history_product ON pricing_history(product_id);
CREATE INDEX idx_pricing_history_effective ON pricing_history(effective_from);

-- For time-series queries
CREATE INDEX idx_inventory_logs_product_time ON inventory_logs(product_id, created_at DESC);
CREATE INDEX idx_transactions_merchant_time ON transactions(merchant_id, transaction_date DESC);
```

---

## API Endpoints Structure

### Authentication
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/refresh
- POST /api/auth/verify-otp

### Products
- GET /api/products - List with filters
- POST /api/products - Create
- GET /api/products/{id} - Detail
- PUT /api/products/{id} - Update
- DELETE /api/products/{id} - Soft delete
- GET /api/products/{id}/similar - Visual similarity search
- POST /api/products/{id}/analyze-image - Trigger image analysis

### Transactions (NEW)
- GET /api/transactions - List
- POST /api/transactions - Create new sale/purchase
- GET /api/transactions/{id} - Detail
- PUT /api/transactions/{id} - Update
- POST /api/transactions/{id}/items - Add item to transaction

### Analytics (NEW)
- GET /api/analytics/dashboard - Main dashboard metrics
- GET /api/analytics/products/performance - Product performance
- GET /api/analytics/trends/sales - Sales trends
- GET /api/analytics/trends/colors - Color trend analysis
- GET /api/analytics/trends/styles - Style trend analysis
- GET /api/analytics/inventory/optimization - Inventory recommendations

### Predictions (NEW)
- GET /api/predictions/demand/{product_id} - Demand forecast
- GET /api/predictions/inventory/{product_id} - Stock recommendations
- GET /api/predictions/price/{product_id} - Price optimization
- POST /api/predictions/batch - Batch predictions

### Image Analysis (NEW)
- POST /api/images/analyze - Analyze uploaded image
- POST /api/images/search - Visual similarity search
- GET /api/images/colors/trending - Trending colors

### Reports (NEW)
- GET /api/reports/sales - Sales report
- GET /api/reports/inventory - Inventory report
- GET /api/reports/trends - Trend report
- POST /api/reports/generate - Custom report generation

---

## ML/AI Pipeline Architecture

```
Image Upload
    ↓
[Image Preprocessing]
    ↓
[Feature Extraction] → Store embeddings in product table
    ↓
[Color Analysis] → Extract dominant colors
    ↓
[Pattern Classification] → Identify patterns
    ↓
[Style Recognition] → Classify style
    ↓
[Auto Tagging] → Generate tags
    ↓
Update Product Record
```

```
Transaction Data
    ↓
[Data Aggregation]
    ↓
[Feature Engineering] → Time-series features
    ↓
[Model Training] → Prophet/LSTM for forecasting
    ↓
[Prediction Generation]
    ↓
Store in predictions table
    ↓
Serve via API
```

---

## Project Structure

```
/app/
├── backend/
│   ├── main.py                 # FastAPI app entry
│   ├── requirements.txt
│   ├── .env
│   ├── config/
│   │   └── settings.py         # Configuration
│   ├── models/
│   │   ├── __init__.py
│   │   ├── merchant.py
│   │   ├── user.py
│   │   ├── product.py
│   │   ├── transaction.py      # NEW
│   │   ├── analytics.py        # NEW
│   │   └── prediction.py       # NEW
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── product_schema.py
│   │   ├── transaction_schema.py
│   │   └── analytics_schema.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py             # Dependencies
│   │   ├── auth.py
│   │   ├── products.py
│   │   ├── transactions.py     # NEW
│   │   ├── analytics.py        # NEW
│   │   └── predictions.py      # NEW
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── product_service.py
│   │   ├── transaction_service.py
│   │   ├── analytics_service.py    # NEW
│   │   └── ml_service.py           # NEW
│   ├── ml/
│   │   ├── __init__.py
│   │   ├── image_analysis/
│   │   │   ├── __init__.py
│   │   │   ├── color_extractor.py
│   │   │   ├── pattern_classifier.py
│   │   │   ├── style_recognizer.py
│   │   │   └── visual_search.py
│   │   ├── forecasting/
│   │   │   ├── __init__.py
│   │   │   ├── demand_forecaster.py
│   │   │   └── trend_detector.py
│   │   └── recommendations/
│   │       ├── __init__.py
│   │       └── product_recommender.py
│   ├── core/
│   │   ├── database.py
│   │   ├── security.py
│   │   └── utils.py
│   └── tests/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/
│   │   │   │   ├── AnalyticsDashboard.jsx
│   │   │   │   ├── SalesChart.jsx
│   │   │   │   └── TrendWidget.jsx
│   │   │   ├── products/
│   │   │   ├── analytics/        # NEW
│   │   │   └── predictions/      # NEW
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Products.jsx
│   │   │   ├── Analytics.jsx     # NEW
│   │   │   └── Predictions.jsx   # NEW
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── utils/
│   │   └── App.js
│   ├── package.json
│   └── tailwind.config.js
│
└── memory/
    ├── PRD.md
    ├── SUPPLYSYNC_VISION.md
    └── IMPLEMENTATION_PLAN.md
```

---

**Next:** Start implementing this architecture!
