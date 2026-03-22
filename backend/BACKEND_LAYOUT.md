# Backend layout (readability)

## Principles

| Layer | Role |
|--------|------|
| **`server.py`** | `FastAPI` app, CORS, `include_router` only (~80 lines) |
| **`routers/`** | `APIRouter` per domain — HTTP only, thin handlers |
| **`services/`** | Reusable logic (no `Request` / route decorators) |
| **`schemas/`** | Pydantic request/response models |
| **`models/`** | SQLAlchemy ORM |
| **`admin_routes.py`** | Admin API router (can move to `routers/admin.py` later) |

## Routers (`routers/`)

| File | Prefix (under `/api`) | Contents |
|------|------------------------|----------|
| `reference.py` | `/reference` | Tile sizes, make/surface/application/body/quality types |
| `health.py` | `/` | Root + `/health` |
| `auth.py` | `/auth` | Login, signup, register dealer, `/me` |
| `dealer_dashboard.py` | `/dealer` | `/dashboard/stats` |
| `dealer_inventory.py` | `/dealer` | Subcategories list, products-in-subcategory, create subcategory, `/search` |
| `dealer_images.py` | `/dealer` | Product image upload (Cloudinary), list, primary, delete, reorder |
| `dealer_products.py` | `/dealer` | Product CRUD, transactions, activity log |

`dealer_images` is registered **before** `dealer_products` so paths like `/dealer/products/{id}/images/...` resolve correctly.

## Services (`services/`)

| File | Purpose |
|------|---------|
| `tiles_category.py` | `get_or_create_tiles_category()` |
| `coverage.py` | Per-piece / per-box coverage from mm × packing |
| `product_activity.py` | `log_product_activity()` |
| `image_colors.py` | Dominant color extraction (ColorThief) |

## Schemas (`schemas/`)

| File | Purpose |
|------|---------|
| `auth.py` | Login/signup/register Pydantic models |
| `images.py` | `ImageUploadResponse` |

## DB patches (existing databases)

After pulling changes, run SQL migrations not yet applied. Full resets run these via `reset_db.py` in order.

**Quick fix** (Inventory / `UndefinedColumn` on `sub_categories`): from `backend/` run `python run_supplysync_migrations.py` — see **`MIGRATIONS.md`**.

| Patch | Purpose | Apply (from `backend/`, `.env` has `DATABASE_URL`) |
|--------|---------|-----------------------------------------------------|
| `add_subcategory_size_id.sql` | Adds `sub_categories.size_id` → `sizes` | `python run_add_subcategory_size_id.py` |
| `add_subcategory_application_body.sql` | `application_type_id`, `body_type_id`; `make_type_id` nullable; partial unique indexes | `python run_add_subcategory_application_body.py` |
| `add_coverage_fields.sql` | `coverage_per_pc_*` on subcategories & products; `coverage_per_box_*` on products | `python run_add_coverage_fields.py` |

Or run the SQL manually with `psql` against your database.

## Optional next steps

- Move `admin_routes.py` → `routers/admin.py`
- Add `pytest` per router
- Use `APIRouter` `dependencies=[Depends(require_dealer)]` to DRY dealer checks
