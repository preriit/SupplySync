# UI Migration Rollout (Phase 4)

Phase 4 applies the theme foundation and shared UI components to remaining high-impact dealer pages.

## Guardrail

- UI-only changes
- No API contract changes
- No business logic changes
- No route or permission changes

## Pages migrated in Phase 4

### `frontend/src/pages/StockAlertsPage.js`

- Migrated to `DealerPageShell` for consistent app frame.
- Replaced custom heading block with `SectionHeader`.
- Replaced ad-hoc quantity color text with `StatusChip` for semantic consistency.

### `frontend/src/pages/DealerProfile.js`

- Migrated to `DealerPageShell`.
- Replaced page heading block with `SectionHeader`.
- Preserved edit/save/cancel behavior and profile API flow unchanged.

### `frontend/src/pages/ProductDetail.js`

- Migrated loading and main views to `DealerPageShell`.
- Replaced heading block with `SectionHeader` while preserving action buttons.
- Standardized several detail badges with `StatusChip` to align status visuals.
- Kept edit, save, delete, history, and image upload flows unchanged.

## Notes on comments

Code comments were included in shared components and existing pages to explain:

- why shell/layout is centralized
- why semantic chips are used for status meaning
- why behavior handlers were intentionally preserved

## Next optional migration batch

If you want complete Phase 4 parity across all admin screens, apply the same `SectionHeader`/tokenized surface patterns in:

- `frontend/src/pages/AdminAnalytics.js`
- `frontend/src/pages/AdminMerchants.js`
- `frontend/src/pages/AdminReferenceData.js`
- `frontend/src/pages/AdminUsers.js`

