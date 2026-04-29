# UI Theme Foundation (Phase 1)

This document defines the visual foundation layer for SupplySync.  
Phase 1 is intentionally **UI-only** and does not alter any product behavior, APIs, or business logic.

## Goals

- Establish a single source of truth for colors, surfaces, text roles, borders, shadows, and radius.
- Keep existing pages functional while allowing gradual UI standardization.
- Enable a consistent enterprise dashboard feel across pages.

## Token Source

Theme tokens are defined in `frontend/src/index.css` under `:root`.

Primary semantic tokens:

- `--app-bg`: main app canvas background
- `--surface-1`, `--surface-2`: content surfaces
- `--surface-sidebar`, `--surface-sidebar-hover`, `--surface-sidebar-active`: nav surfaces
- `--text-strong`, `--text-muted`, `--text-on-dark`: typography roles
- `--brand`, `--brand-hover`: accent/CTA colors
- `--success`, `--warning`, `--danger`: status colors
- `--border-soft`, `--border-strong`: border hierarchy
- `--shadow-soft`, `--shadow-card`: shadow hierarchy
- `--radius-card`, `--radius-input`, `--radius-pill`: shape system

## Tailwind Mapping

Mapped in `frontend/tailwind.config.cjs`:

- Existing aliases preserved for compatibility (`orange`, `slate`, `grey`).
- Added semantic namespace `app.*` for new styling work:
  - `app.bg`, `app.surface`, `app.muted`
  - `app.sidebar`, `app.sidebar-hover`, `app.sidebar-active`
  - `app.text`, `app.text-muted`, `app.text-on-dark`
  - `app.border`, `app.border-strong`
  - `app.success`, `app.warning`, `app.danger`
- Added box-shadow tokens `shadow-soft`, `shadow-panel`.
- Added border-radius tokens `rounded-card`, `rounded-input`, `rounded-pill`.

## Reusable Utility Primitives

Defined in `frontend/src/index.css` under `@layer components`:

- `.theme-page`
- `.theme-surface`
- `.theme-surface-muted`
- `.theme-heading`
- `.theme-muted`
- `.theme-pill`
- `.theme-focus-ring`

These are optional opt-in helpers to reduce one-off utility chains while migrating pages.

## Migration Guidance

For upcoming UI passes:

1. Use semantic token classes/colors before hard-coded hex values.
2. Prefer `app.*` colors in Tailwind classes for new components.
3. Keep behavior untouched; limit changes to visual structure and presentation.
4. Migrate page-by-page (Dashboard -> Inventory -> Team -> Details) to minimize regressions.

