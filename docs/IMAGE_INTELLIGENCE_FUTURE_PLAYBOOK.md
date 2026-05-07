# Image Intelligence Future Playbook

## Purpose

Define how SupplySync can experiment with image-driven capabilities now and scale into production-ready image intelligence later.

This document is planning-only. Implementation can be taken up in later phases.

## Why this matters

- Tile/flooring decisions are highly visual.
- Better image understanding can improve discovery, matching, and reporting.
- Image intelligence can become a product moat as dealer and catalog volume grows.

## High-value use cases

1. **Search by image**
   - User uploads a photo and finds similar products in catalog.
2. **Match by image (substitutes)**
   - Show visually similar alternatives on product detail.
3. **Color/style-based reports**
   - Sales and stock patterns by color family, texture, and style.
4. **Catalog quality checks**
   - Detect missing images, low-quality assets, and duplicates.

## Practical play mode (safe experiments)

Start small with controlled internal experiments:

- Build a sample set of 200-500 product images.
- Run image similarity on this subset only.
- Validate results manually with business users.
- Track precision@k (how often top 5 matches are useful).
- Iterate before broad rollout.

## Recommended phased approach

### Phase A: Data foundation

- Unify image storage in one location (Cloudinary recommended for current setup).
- Ensure one canonical image URL per image record.
- Keep `primary_image_url` synced from `product_images`.
- Add image metadata consistency checks.

### Phase B: Metadata enrichment

- Standardize dominant color + color palette extraction.
- Add perceptual hash (`phash`) for duplicate detection.
- Add image quality score (blur, size, aspect ratio checks).
- Add optional style tags (`marble-look`, `wood-look`, `decor`, etc.).

### Phase C: Similarity engine

- Generate image embeddings (CLIP-style model).
- Store vectors in pgvector (or vector DB later if needed).
- Add “similar products” API for product detail page.
- Re-rank by business constraints (size, stock, dealer scope).

### Phase D: Search-by-image

- Add upload-to-search flow in web/mobile.
- Return top matches with confidence + explainers.
- Add user feedback (“Was this useful?”) for quality loop.

### Phase E: Reporting and insights

- Region-wise visual trend reports (color/style vs movement).
- Dealer-level assortment gaps by visual category.
- Opportunity reports: “high regional demand for styles missing in this dealer’s stock.”

## Good practices (do this from day one)

### 1) Keep image source of truth clean

- Store all images in one storage provider.
- Maintain canonical URL and stable image ID.
- Avoid silent dual-path logic long term.

### 2) Preserve original + derived data

- Keep original uploaded image.
- Store transformed/display versions separately.
- Version analysis outputs (embedding model version, color extraction version).

### 3) Make analysis async

- Upload path should remain fast.
- Run heavy analysis in background jobs.
- Track status per image (`pending`, `done`, `failed`).

### 4) Add confidence and fallback

- Every AI output should include confidence.
- If confidence is low, fall back to deterministic filters.
- Never block core inventory flows due to AI failures.

### 5) Scope by business context

- Similarity should be constrained by practical filters:
  - subcategory/size compatibility
  - in-stock preference
  - dealer/region scope when relevant

### 6) Measure before scaling

Track:
- match usefulness rate
- click-through on similar products
- conversion impact from image search
- false-match complaints

## Suggested future schema additions

Target table: `product_images` (or side table if preferred)

- `image_hash` (for duplicate detection)
- `analysis_status`
- `analysis_error`
- `analysis_version`
- `embedding_vector` (or vector reference id)
- `dominant_color_family`
- `quality_score`
- `style_tags` (JSON/array)

Optional side table:
- `image_analysis_runs` for traceability and reprocessing control

## API ideas for future implementation

- `POST /dealer/images/search-by-image`
- `GET /dealer/products/{product_id}/similar-by-image`
- `GET /dealer/reports/image-trends`

All responses should include:
- confidence
- rank score
- minimal explanation tags

## Risks and mitigations

- **Poor input images** -> add quality checks and user hints.
- **Wrong matches** -> combine embedding score + business rules + feedback.
- **Model drift over time** -> version outputs and reprocess in batches.
- **Infra cost growth** -> start with subset and measure business lift first.

## Definition of “ready to build”

Before implementation starts:

- Image storage unification complete.
- Metadata consistency baseline complete.
- Pilot evaluation dataset prepared.
- Success metrics agreed (search usefulness, CTR uplift, substitute conversion).

