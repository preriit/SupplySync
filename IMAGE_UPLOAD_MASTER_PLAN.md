# P3: Image Upload & Analytics - Master Plan

## 📋 Overview

Images are a **strategic asset** for SupplySync, enabling:
1. Visual product discovery
2. AI-powered demand analytics
3. Color/pattern trend analysis
4. Social sharing & marketing
5. Hyperlocal preference insights

---

## 🎯 Vision & Goals

### Business Objectives
- **Immediate**: Professional product presentation with images
- **Short-term**: Social sharing to increase reach
- **Long-term**: AI-powered analytics linking images to sales data

### Technical Objectives
- Scalable image storage infrastructure
- Metadata extraction for future ML/AI
- Public URLs for sharing
- Analytics-ready data structure

---

## 🏗️ Architecture Decisions

### Image Storage Strategy
**Selected Approach**: Cloud Storage (AWS S3 / Cloudinary)

**Why Cloud Storage:**
- ✅ Unlimited scalability
- ✅ Public URLs for social sharing
- ✅ CDN for global fast delivery
- ✅ Compatible with AI/ML processing pipelines
- ✅ Cost-effective at scale
- ✅ No server storage limitations

**Alternative Considered**: Local storage - **Rejected** due to:
- ❌ Not scalable
- ❌ Cannot generate public share URLs
- ❌ No CDN benefits
- ❌ Server disk space limitations

---

### Database Schema

**Enhanced `product_images` table:**

```sql
-- Existing fields
id UUID PRIMARY KEY
product_id UUID REFERENCES products(id)
image_url TEXT
is_primary BOOLEAN
ordering INT
uploaded_at TIMESTAMP

-- NEW fields for Phase 1
public_url TEXT              -- Shareable public URL
cdn_url TEXT                 -- CDN URL if different from public_url
file_size_bytes INT          -- File size for analytics
width_px INT                 -- Image dimensions
height_px INT
format VARCHAR(10)           -- jpg, png, webp
color_palette JSONB          -- Extracted colors: ["#FF5733", "#C70039", ...]
dominant_colors JSONB        -- Top colors with %: [{"color": "#FF5733", "percent": 45.2}]

-- FUTURE fields (Phase 3)
image_metadata JSONB         -- ML-extracted features
pattern_type VARCHAR(50)     -- Detected pattern (future ML)
ml_tags JSONB               -- AI-generated tags (future)
```

---

### Color Extraction Technology

**Library**: Python ColorThief + Pillow

**What we extract:**
1. **Dominant Color** - Single most prominent color
2. **Color Palette** - Top 5-10 colors in the image
3. **Color Percentages** - How much of image each color occupies

**Storage Format:**
```json
{
  "palette": ["#FF5733", "#C70039", "#900C3F", "#581845"],
  "dominant": {
    "color": "#FF5733",
    "percent": 45.2
  },
  "top_colors": [
    {"color": "#FF5733", "percent": 45.2},
    {"color": "#C70039", "percent": 23.1},
    {"color": "#900C3F", "percent": 15.7}
  ]
}
```

**Use Cases:**
- Analytics: "Which colors sell best?"
- Filtering: "Show me all red tiles"
- Trends: "Red tiles trending in Mumbai"
- Recommendations: "Customers who bought blue also liked..."

---

## 📅 Phased Implementation Plan

---

## **PHASE 1: Foundation (CURRENT - P3.1)**

### Scope
Build the **core image infrastructure** with analytics readiness.

### Features to Implement

#### 1. Cloud Storage Integration
- Set up AWS S3 / Cloudinary account
- Configure bucket/storage with public read access
- Generate signed upload URLs (server-side)
- Store public URLs in database

#### 2. Backend APIs
**New Endpoints:**

```
POST /api/dealer/products/{id}/images/upload
- Upload image file
- Extract colors automatically
- Store metadata
- Return: image_id, public_url, colors

GET /api/dealer/products/{id}/images
- List all images for product
- Return: url, is_primary, colors, dimensions

PUT /api/dealer/products/{id}/images/{image_id}/primary
- Set image as primary

DELETE /api/dealer/products/{id}/images/{image_id}
- Delete image (soft delete or hard delete from cloud)
```

#### 3. Color Extraction Pipeline
**Server-side processing:**
```python
from PIL import Image
from colorthief import ColorThief

def extract_colors(image_path):
    # Get dominant color
    dominant = ColorThief(image_path).get_color(quality=1)
    
    # Get palette (top 5 colors)
    palette = ColorThief(image_path).get_palette(color_count=5)
    
    # Convert to hex
    colors = [rgb_to_hex(color) for color in palette]
    
    return {
        "dominant": rgb_to_hex(dominant),
        "palette": colors
    }
```

#### 4. Frontend - Image Upload UI
**Location**: ProductDetail.js page

**Features:**
- Drag & drop zone
- Multiple file selection
- Image preview thumbnails
- Upload progress indicators
- Set primary image (radio button)
- Delete images
- Reorder images (drag to reorder)

**UI Components:**
```jsx
<ImageUploadZone>
  - Drag & drop area
  - "Click to upload" button
  - File type validation
  - Size limit validation (5MB)
</ImageUploadZone>

<ImageGallery>
  - Grid of uploaded images
  - Primary image badge
  - Delete button
  - Drag handles for reordering
</ImageGallery>
```

#### 5. Display Images
**Update Components:**
- **ProductsList.js**: Show primary image in product cards
- **ProductDetail.js**: Image gallery with zoom
- **AddProduct.js**: Upload during creation

#### 6. Database Migration
```sql
-- Add columns to existing table
ALTER TABLE product_images 
  ADD COLUMN public_url TEXT,
  ADD COLUMN file_size_bytes INT,
  ADD COLUMN width_px INT,
  ADD COLUMN height_px INT,
  ADD COLUMN format VARCHAR(10),
  ADD COLUMN color_palette JSONB,
  ADD COLUMN dominant_colors JSONB;

-- Add index for color queries (future)
CREATE INDEX idx_product_images_colors ON product_images 
  USING GIN (color_palette);
```

### Deliverables
- ✅ Cloud storage configured
- ✅ Image upload working (backend + frontend)
- ✅ Color extraction automatic
- ✅ Images displayed in product cards
- ✅ Primary image selection
- ✅ Image metadata stored (ready for analytics)

### Success Metrics
- Dealers can upload 1-10 images per product
- Colors automatically extracted and stored
- Images load fast with CDN
- Database ready for Phase 2 analytics

---

## **PHASE 2: Social Sharing (P3.2)**

### Scope
Enable dealers to **share products** via social media with rich previews.

### Features to Implement

#### 1. Public Share Page
**New Route**: `/share/product/{product_id}` (no authentication)

**Features:**
- Beautiful product display
- Primary image prominent
- Product details (brand, name, specs)
- Dealer contact info
- "View More" button (links to main site)

#### 2. Open Graph Tags
**For WhatsApp/Telegram/Facebook preview:**
```html
<meta property="og:title" content="Kajaria Premium Glossy - 12x12 GVT" />
<meta property="og:description" content="Premium quality tiles..." />
<meta property="og:image" content="{primary_image_public_url}" />
<meta property="og:url" content="{share_url}" />
<meta property="og:type" content="product" />
<meta property="product:price:amount" content="45.50" />
```

#### 3. Share Buttons
**Add to ProductDetail.js:**
- 📱 WhatsApp Share
- ✈️ Telegram Share
- 🔗 Copy Link
- 📧 Email (optional)

**Implementation:**
```javascript
const shareOnWhatsApp = () => {
  const url = `${window.location.origin}/share/product/${productId}`;
  const text = `Check out ${product.brand} ${product.name}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`);
};
```

#### 4. Short URLs (Optional)
- Generate short URLs for cleaner sharing
- Track click analytics
- Service: Bitly API or custom shortener

#### 5. Analytics
**Track:**
- Share count per product
- Share medium (WhatsApp, Telegram, etc.)
- View count on share page
- Conversion from share to inquiry

### API Endpoints
```
POST /api/dealer/products/{id}/share
- Generate share URL
- Log share event
- Return: share_url, preview_image

GET /public/share/product/{id}
- Public endpoint (no auth)
- Return: product details + images

POST /api/analytics/share/view/{product_id}
- Track share page views
```

### Deliverables
- ✅ Public share page with image preview
- ✅ Share buttons in product detail
- ✅ Open Graph tags for rich preview
- ✅ Share analytics tracking

---

## **PHASE 3: Advanced Analytics (P3.3 - Future)**

### Scope
AI-powered insights linking **images, colors, and sales data**.

### Features to Implement

#### 1. Advanced Image Analysis
**ML Pipeline:**
- Pattern recognition (floral, geometric, marble, wood, etc.)
- Texture analysis (glossy, matt, rustic)
- Style classification (modern, traditional, industrial)
- Quality assessment

**Technologies:**
- TensorFlow / PyTorch
- Pre-trained models (ResNet, EfficientNet)
- Custom training on tile images

#### 2. Color Analytics Dashboard
**Metrics:**
- Top selling colors (by region, season)
- Color trend analysis over time
- Color preference by customer segment
- Color combinations that sell together

**Visualizations:**
- Color wheel with sales heatmap
- Trend lines (color popularity over time)
- Geographic color maps

#### 3. Transaction-Image Link
**Data Model:**
```sql
CREATE TABLE product_sales_analytics (
  id UUID PRIMARY KEY,
  product_id UUID,
  image_id UUID,
  transaction_id UUID,
  sale_date DATE,
  quantity INT,
  location VARCHAR(100),
  -- Color at time of sale (in case product image changes)
  primary_color VARCHAR(7),
  color_palette JSONB
);
```

**Analytics Queries:**
- "Which colors sell best in Mumbai?"
- "Red tiles sell 30% more in winter"
- "Customers who bought blue bought brown next"

#### 4. Predictive Analytics
**ML Models:**
- Demand forecasting by color/pattern
- Inventory optimization
- Price optimization by visual features
- Recommendation engine

**Insights:**
- "Stock more beige tiles - demand increasing 15%"
- "Geometric patterns trending in your area"
- "Similar products customers viewed"

#### 5. Pattern Recognition
**Detect patterns automatically:**
- Plain
- Marble effect
- Wood grain
- Geometric
- Floral
- Abstract
- Textured

**Use Cases:**
- Filter: "Show me all marble-effect tiles"
- Analytics: "Marble patterns outselling geometric 2:1"
- Recommendations: "Similar patterns"

#### 6. Hyperlocal Insights
**Geographic Analysis:**
- Color preferences by city/region
- Pattern preferences by demographics
- Seasonal trends by location
- Competition analysis (what's trending nearby)

**Dashboard:**
- Map view with color/pattern overlays
- Heatmaps of demand
- Regional comparison charts

### Technologies Required
- **ML Framework**: TensorFlow, PyTorch
- **Image Processing**: OpenCV, scikit-image
- **Analytics**: Pandas, NumPy
- **Visualization**: D3.js, Chart.js
- **Data Warehouse**: BigQuery, Snowflake (optional)

### Deliverables
- ✅ ML models trained on tile images
- ✅ Automated pattern/style detection
- ✅ Color analytics dashboard
- ✅ Transaction-image linkage
- ✅ Predictive demand models
- ✅ Hyperlocal insights dashboard

---

## 🗂️ File Structure Plan

```
/app/backend/
├── services/
│   ├── image_service.py       # Image upload, storage
│   ├── color_extraction.py    # Color analysis
│   └── ml_service.py          # Future ML models (Phase 3)
├── utils/
│   ├── s3_client.py          # AWS S3 helper
│   └── cloudinary_client.py  # Cloudinary helper
└── routes/
    └── images.py             # Image API endpoints

/app/frontend/src/
├── components/
│   ├── ImageUpload.js        # Drag-drop upload
│   ├── ImageGallery.js       # Display images
│   └── ShareButtons.js       # Social share (Phase 2)
└── pages/
    └── PublicProductShare.js # Public share page (Phase 2)
```

---

## 🔧 Technical Specifications

### Image Specifications
- **Max file size**: 5 MB per image
- **Max images per product**: 10 images
- **Formats allowed**: JPEG, PNG, WebP
- **Dimensions**: Recommended 1200x1200px, max 4000x4000px
- **Compression**: Automatic optimization by CDN

### Storage Costs (Estimated)
**AWS S3 + CloudFront:**
- Storage: $0.023/GB/month
- Transfer: $0.085/GB
- For 1000 products with 5 images each (5MB avg): ~$115/month

**Cloudinary Free Tier:**
- 25 GB storage
- 25 GB bandwidth/month
- Enough for ~5000 images

### Performance Targets
- **Upload**: < 5 seconds for 5MB image
- **Page load**: < 2 seconds (with CDN)
- **Color extraction**: < 1 second per image
- **Share page load**: < 1 second

---

## 📊 Success Metrics

### Phase 1 (Foundation)
- [ ] 90% of products have images
- [ ] Average 3-5 images per product
- [ ] 100% images have color data extracted
- [ ] Zero upload failures

### Phase 2 (Sharing)
- [ ] 50% of dealers use share feature
- [ ] 1000+ product shares per month
- [ ] 30% click-through rate on shares
- [ ] WhatsApp most popular channel

### Phase 3 (Analytics)
- [ ] Color analytics dashboard live
- [ ] ML pattern detection 85%+ accuracy
- [ ] Hyperlocal insights for top 10 cities
- [ ] Predictive models 70%+ accuracy

---

## 🚧 Known Challenges & Solutions

### Challenge 1: Large File Uploads
**Problem**: 5MB images slow to upload

**Solution**: 
- Client-side compression before upload
- Chunked upload for large files
- Progress indicators

### Challenge 2: Color Extraction Accuracy
**Problem**: ColorThief may not capture all nuances

**Solution**:
- Use multiple algorithms (K-means, median cut)
- Manual color tagging as fallback
- Train custom model in Phase 3

### Challenge 3: Storage Costs
**Problem**: Costs increase with images

**Solution**:
- Automatic image optimization/compression
- CDN caching reduces transfer costs
- Delete unused images periodically

### Challenge 4: Public URL Security
**Problem**: Anyone can access shared images

**Solution**:
- Watermark images for public shares
- Rate limiting on share pages
- Obfuscated URLs (not guessable)

---

## 📝 Implementation Checklist

### Phase 1: Foundation
- [ ] Choose storage provider (S3 / Cloudinary)
- [ ] Set up cloud storage account & credentials
- [ ] Install Python libraries (Pillow, ColorThief)
- [ ] Create database migration
- [ ] Build upload API endpoint
- [ ] Implement color extraction
- [ ] Build frontend upload UI
- [ ] Update product cards to show images
- [ ] Test upload + extraction pipeline
- [ ] Document API endpoints

### Phase 2: Sharing
- [ ] Create public share page
- [ ] Add Open Graph meta tags
- [ ] Build share buttons component
- [ ] Implement share analytics
- [ ] Test WhatsApp/Telegram preview
- [ ] Add share tracking

### Phase 3: Analytics
- [ ] Design analytics database schema
- [ ] Build ML training pipeline
- [ ] Train pattern recognition model
- [ ] Build color analytics dashboard
- [ ] Implement hyperlocal insights
- [ ] Create predictive models

---

## 🔗 Dependencies

### Phase 1
- Cloud storage account (AWS/Cloudinary)
- Python packages: `Pillow`, `colorthief`, `boto3` (for S3)
- Frontend: File upload component

### Phase 2
- None (uses Phase 1 infrastructure)

### Phase 3
- ML infrastructure (GPU recommended)
- Data science team or ML engineer
- Large dataset of tile images with labels
- Analytics dashboard framework

---

## 📚 References & Resources

### Color Extraction
- ColorThief: https://github.com/fengsp/color-thief-py
- K-means clustering: https://scikit-learn.org/stable/modules/clustering.html

### Image Storage
- AWS S3: https://aws.amazon.com/s3/
- Cloudinary: https://cloudinary.com/documentation

### ML/Pattern Recognition
- TensorFlow Image Classification: https://www.tensorflow.org/tutorials/images/classification
- Transfer Learning: https://www.tensorflow.org/tutorials/images/transfer_learning

### Open Graph
- Protocol: https://ogp.me/
- Debugger: https://developers.facebook.com/tools/debug/

---

## 🎯 Next Steps

**Immediate (Now):**
1. User selects storage provider
2. Implement Phase 1: Foundation
3. Test with real product images
4. Gather dealer feedback

**Short-term (Next 2-4 weeks):**
1. Implement Phase 2: Sharing
2. Monitor share analytics
3. Optimize based on usage

**Long-term (3-6 months):**
1. Gather image + sales data
2. Implement Phase 3: Analytics
3. Train ML models
4. Launch predictive insights

---

**Document Version**: 1.0  
**Last Updated**: March 4, 2026  
**Status**: Phase 1 - Ready to Implement  
**Owner**: SupplySync Development Team
