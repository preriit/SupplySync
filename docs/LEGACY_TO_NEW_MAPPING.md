# Legacy -> New Schema Mapping (Phase 1)

This document defines how legacy tables map to the new SupplySync schema.

## Reference data

- `tile_bodytype.type` -> `body_types.name`
- `tile_maketype.type` -> `make_types.name`
  - `tile_maketype.body_type_id` -> `make_types.body_type_id`
- `tile_surfacetype.type` -> `surface_types.name`
- `tile_applicationtype.type` -> `application_types.name`
- `tile_quality.type` -> `qualities.name`

## Category model

Legacy categories are merchant-scoped and include dimensions:

- `tile_category` (`height/width`, `make_type_id`, `merchant_id`, etc.)

New model separates global taxonomy and shared sub-categories:

- `categories` (global, slug-based)
- `sub_categories` (size + make type combinations)

Phase 1 rule:

- Ensure one global category: `Tiles` (`slug = tiles`).
- Derive sub-category from legacy dimensions + make type.

## Merchants and users

- `merchant_merchant` -> `merchants`
  - `name` -> `name`
  - `phone_number` -> `phone`
  - `address1/address2` -> `address`
  - `gst_number`, `pan`, `email`, flags/timestamps -> corresponding columns

- `user_user` -> `users`
  - `username`, `email`, `phone` -> same
  - `password` -> `password_hash` (copied as-is)
  - `merchant_id` (legacy bigint) -> migrated merchant UUID
  - role/user_type heuristic:
    - superuser/staff -> `admin` / `super_admin`
    - otherwise -> `dealer`

## Products

- `tile_product` -> `products`
  - `merchant_id` -> `merchant_id` (UUID map)
  - legacy size/category/make -> `sub_category_id` (mapped/derived)
  - `brand`, `name`, `packing_per_box` -> same
  - `quantity` -> `current_quantity`
  - tile type foreign keys -> new reference UUIDs

## Images

- `tile_image` -> `product_images`
  - `image` -> `image_url` and `public_url`
  - `is_primary`, `ordering` -> same
  - `created_by_id` -> `uploaded_by` (mapped user UUID)

## Transaction logs

- `tile_productquantitylog` -> `product_transactions`
  - `quantity` sign determines `transaction_type`:
    - `>= 0` -> `add`
    - `< 0` -> `subtract`
  - stored `quantity` -> absolute value
  - `quantity_before/after` reconstructed as running totals ordered by `(product_id, created_at, id)`

## Non-phase-1 tables (deferred)

The following are intentionally excluded from phase 1 migration:

- Django framework/auth internals: `django_*`, `auth_*`, `oauth2_*`, `social_auth_*`
- Legacy catalog subsystem: `catalog_*` (unless explicitly needed)
- Legacy operational tables not represented in new schema

These should be handled only with explicit business need in later phases.
