# UI Component Standardization (Phase 3)

Phase 3 introduces reusable UI components that improve visual consistency while preserving existing behavior.

## Scope and guardrail

- **UI only**: no API, routing, permissions, or business-logic changes.
- Existing interactions are preserved; only presentation structure is standardized.

## New reusable components

### `SectionHeader`

- File: `frontend/src/components/theme/SectionHeader.jsx`
- Purpose: consistent title/subtitle/action alignment for page and section headers.
- Why: removes repeated heading markup and keeps hierarchy uniform.

### `PageToolbar`

- File: `frontend/src/components/theme/PageToolbar.jsx`
- Purpose: shared shell for list controls (search, filters, sort, actions).
- Why: keeps spacing and control density consistent across list pages.

### `StatusChip`

- File: `frontend/src/components/theme/StatusChip.jsx`
- Purpose: semantic status labels (neutral, success, warning, danger, info, brand).
- Why: ensures status meaning is visually consistent across cards and tables.

## Pages migrated in this phase

- `frontend/src/pages/ProductsList.js`
  - Toolbar moved to `PageToolbar`
  - Page heading moved to `SectionHeader`
  - Stock chips moved to `StatusChip`

- `frontend/src/pages/SubCategoriesList.js`
  - Page heading moved to `SectionHeader`
  - Sub-category health badge moved to `StatusChip`

- `frontend/src/pages/DealerDashboard.js`
  - Welcome heading moved to `SectionHeader`

- `frontend/src/pages/TeamMembersPage.js`
  - Page heading moved to `SectionHeader`

## Adoption guidance

When updating another page:

1. Replace top heading block with `SectionHeader`.
2. Replace ad-hoc control wrappers with `PageToolbar`.
3. Replace hand-crafted status badge spans with `StatusChip`.
4. Keep existing behavior handlers and data logic untouched.

This keeps visual consistency high while minimizing functional risk.
