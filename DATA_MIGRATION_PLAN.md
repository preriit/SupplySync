# Data Migration Plan: Django → FastAPI

## Overview
Migrate data from Django production system (SupplySyncBeta1.0) to new FastAPI system.

---

## 🔍 Django System Analysis

### Current Django Models (Production)

#### Product Model (`tile.models.Product`)
```python
- merchant (FK)
- name (CharField, uppercase)
- brand (CharField, uppercase)
- category (FK to Category)
- packing_per_box (PositiveInteger)
- make_type, application_type, body_type, quality, surface_type (FKs)
- height_in_inches, width_in_inches
- height_in_mm, width_in_mm
- quantity (PositiveInteger) - current stock
```

#### Image Model (`tile.models.Image`)
```python
- product (FK)
- image (CharField, max 512) - **S3 URL string**
- is_primary (Boolean)
- ordering (PositiveInteger)
- created_at, updated_at, created_by (BaseModel)
```

**Image Storage:** AWS S3
- Base URL: `https://images.supplysync.in/`
- Upload function: `base.aws.upload_to_s3()`
- Public read access

#### ProductQuantityLog Model
```python
- product (FK)
- quantity (Integer) - change amount (+/-)
- created_at, created_by
```

---

## 🎯 Migration Strategy

### Phase 1: Schema Enhancement (CURRENT)
**Add `product_images` table to FastAPI system**

```sql
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    
    -- Image URLs (support both S3 legacy and Cloudinary new)
    image_url TEXT NOT NULL,           -- Full URL
    storage_type VARCHAR(20),          -- 's3' or 'cloudinary'
    
    -- Display properties
    is_primary BOOLEAN DEFAULT FALSE,
    ordering INT DEFAULT 0,
    
    -- Image metadata (for Cloudinary images)
    public_url TEXT,
    file_size_bytes INT,
    width_px INT,
    height_px INT,
    format VARCHAR(10),
    
    -- Color extraction (Phase 1 feature)
    color_palette JSONB,
    dominant_colors JSONB,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    uploaded_by UUID REFERENCES users(id)
);

CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_product_images_primary ON product_images(product_id, is_primary);
```

### Phase 2: Data Export from Django (PENDING USER ACTION)

**Steps:**
1. Access EC2 production server
2. Export database using pg_dump
3. Extract relevant tables:
   - tile_product
   - tile_image
   - tile_productquantitylog
   - tile_category
   - merchant_merchant
   - user_user

**Export Command:**
```bash
pg_dump -h localhost -U postgres -d supplysync_db \
  -t tile_product \
  -t tile_image \
  -t tile_productquantitylog \
  -t tile_category \
  -t merchant_merchant \
  -t user_user \
  --data-only --column-inserts > /tmp/supplysync_data.sql
```

### Phase 3: Data Transformation & Import

**Mapping:**

| Django Model | FastAPI Model | Notes |
|--------------|---------------|-------|
| tile.Product | products | Map category structure |
| tile.Image | product_images | Set storage_type='s3' |
| tile.ProductQuantityLog | product_transactions | Convert to transaction format |
| merchant.Merchant | merchants | Direct mapping |
| user.User | users | Map user_type to role |

**Image Migration Logic:**
```python
# For each Django Image record:
product_image = {
    "product_id": mapped_product_id,
    "image_url": django_image.image,  # Keep S3 URL
    "storage_type": "s3",              # Mark as legacy S3
    "is_primary": django_image.is_primary,
    "ordering": django_image.ordering,
    "created_at": django_image.created_at,
    # Color extraction fields: NULL (extract later)
}
```

### Phase 4: Dual Image System

**Legacy S3 Images (Read-Only):**
- Keep existing `https://images.supplysync.in/` URLs
- Display in product cards/detail pages
- No new uploads to S3
- Mark with `storage_type='s3'`

**New Cloudinary Images (Read-Write):**
- All new uploads go to Cloudinary
- Automatic color extraction
- Mark with `storage_type='cloudinary'`
- Full metadata stored

**UI Handling:**
```javascript
// Frontend: Display images regardless of source
{images.map(img => (
  <img 
    src={img.image_url}  // Works for both S3 and Cloudinary
    alt={product.name}
  />
))}
```

---

## 📋 Migration Checklist

### Pre-Migration (CURRENT)
- [x] Clone Django repository
- [x] Analyze data models
- [x] Design compatible schema
- [ ] Add `product_images` table to FastAPI
- [ ] Build Cloudinary upload feature
- [ ] Test Cloudinary integration

### Data Export (USER ACTION REQUIRED)
- [ ] Access EC2 server
- [ ] Export production database
- [ ] Download to local machine
- [ ] Upload to /app for processing

### Data Import
- [ ] Create migration script
- [ ] Map Django data to FastAPI schema
- [ ] Import users & merchants
- [ ] Import categories & products
- [ ] Import images (preserve S3 URLs)
- [ ] Import transaction logs
- [ ] Verify data integrity

### Post-Migration
- [ ] Test image display (both S3 and Cloudinary)
- [ ] Test new image upload to Cloudinary
- [ ] Run color extraction on migrated images (optional)
- [ ] Update documentation
- [ ] Train users on new system

---

## 🔧 Technical Decisions

### Why Keep S3 URLs?
✅ **Pros:**
- No need to migrate thousands of images
- Existing URLs continue working
- Faster migration
- No data loss risk

❌ **Cons:**
- Two storage systems to manage
- S3 images lack color metadata (can extract later)

**Decision:** Keep S3, add Cloudinary for new uploads

### Color Extraction for Legacy Images
**Option 1:** Extract during migration (slow, comprehensive)
**Option 2:** Extract on-demand when viewed (fast migration, lazy loading)
**Option 3:** Never extract for legacy (keep as-is)

**Recommendation:** Option 2 - Extract on-demand

---

## 🚀 Implementation Order

**TODAY:**
1. ✅ Analyze Django models (DONE)
2. ✅ Create migration plan (DONE)
3. Add `product_images` table schema
4. Implement Cloudinary upload feature
5. Test image upload with color extraction

**AFTER DATA EXPORT:**
6. Write migration script
7. Import data
8. Verify & test
9. Go live

---

## 📞 Next Steps for User

**To proceed with data migration, you need to:**

1. **Export production data** from EC2 server
   - Follow guide: `/app/guides/ACCESS_EC2_BEGINNER.md`
   - Run pg_dump command
   - Download SQL file

2. **Provide data file** to this environment
   - Upload to `/app/django_data/`
   - We'll process and import

**OR**

**Continue building features first:**
- Implement image upload with Cloudinary
- Build other features
- Migrate data later before go-live

---

**Last Updated:** March 4, 2026  
**Status:** Schema design complete, awaiting data export
