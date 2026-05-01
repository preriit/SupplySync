# Behavior Contract: Step 15 Post-Pilot Hardening and Admin Baseline

## Contract metadata

- Contract Name: Step 15 Post-Pilot Hardening and Admin Baseline
- Domain: Migration / Dealer Inventory / Admin Operations
- Owner: Engineering
- Reviewers: Product, QA
- Created On: 2026-05-01
- Last Updated: 2026-05-01 (behaviors activated at Step 15 closure)

## Problem and intent

- Problem statement: After Step 14 completion, one residual parity area (mobile edit completeness) and one admin support workflow still need explicit contract-first delivery for broader rollout confidence.
- User/business outcome: Pilot-to-broader-rollout transition stays stable with fewer support escalations and consistent cross-platform behavior.
- In scope:
  - Full required mobile product edit-field parity and behavior hardening.
  - One admin support-critical baseline workflow.
  - Contract-first definition for API/data/type/UI behavior.
- Out of scope:
  - Full admin module parity.
  - New architecture or storage redesign.

## Behavior matrix

| Behavior ID | Scenario | Expected Behavior | Status | Introduced in | Deprecated in | Obsolete in | Replaced by | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| STEP15-EDIT-001 | Dealer edits product on mobile | Required editable fields are visible and save successfully with valid payload | active | Step 15 |  |  |  | Align with web-required field set |
| STEP15-EDIT-002 | Mobile edit API validation error | User sees clear validation/server error and can retry without app freeze | active | Step 15 |  |  |  | Includes loading + error + retry states |
| STEP15-ADMIN-001 | Admin activates/suspends non-admin user account | Status toggle completes with role-safe access, confirmation, and actionable API error handling | active | Step 15 |  |  |  | Workflow selected for Step 15 admin baseline |

Allowed status values: `draft`, `active`, `deprecated`, `obsolete`.

## Functional contract

### Inputs

- Actor(s): Dealer user, Admin/ops user.
- Preconditions:
  - Authenticated session with valid token.
  - Product exists and is editable for dealer flow.
  - Admin user has required role permissions.
- Trigger/action:
  - Dealer submits product edit form in mobile app.
  - Admin confirms activate/suspend action in admin user management view.
- Data inputs:
  - Product payload fields (brand/name/SKU/packing and other required IDs).
  - Admin status update request payload (`is_active`: boolean).

### Outputs

- User-visible output:
  - Success confirmation on save/action.
  - Clear actionable error text on validation/system failure.
- System output:
  - Updated product/admin domain entity payload from API.
- Persistence side effects:
  - Product row updated for dealer edit flow.
  - Admin workflow-specific state persisted per endpoint contract.

### Errors and edge cases

- Validation failures:
  - Missing/invalid required IDs or field values return `400` with clear `detail`.
- Permission failures:
  - Unauthorized/forbidden responses (`401`/`403`) for role mismatches.
- Data anomalies:
  - Missing product/admin target resource returns `404`.
- Fallback behavior:
  - UI remains interactive after error and supports immediate retry.

## API contract (if applicable)

### Endpoint

- Method: `PUT`
- Path: `/dealer/products/{product_id}`
- Auth: Dealer bearer token required

### Request shape

```json
{
  "brand": "string",
  "name": "string",
  "sku": "string|null",
  "surface_type_id": "uuid-string",
  "application_type_id": "uuid-string",
  "body_type_id": "uuid-string",
  "quality_id": "uuid-string",
  "packing_per_box": 1
}
```

### Response shape

```json
{
  "message": "Product updated successfully",
  "product": {
    "id": "uuid-string"
  }
}
```

### Error shape

```json
{
  "detail": "Validation or permission error message"
}
```

## UI contract (if applicable)

- Screens/components affected:
  - `apps/mobile/app/inventory/[subcategoryId]/products/[productId].js`
  - `frontend/src/pages/AdminUsers.js`
- States (loading/empty/error/success):
  - Loading on submit/fetch, actionable error banner/text, success feedback on completion.
- Labels/formatting rules:
  - Field labels align with existing product naming used on web where practical.
- Accessibility requirements:
  - Form controls remain keyboard/screen-reader navigable in web target.

## Data contract (if applicable)

- Tables/models involved:
  - `products` and selected admin workflow domain table(s).
- New fields:
  - None planned for initial Step 15 slice (reassess during admin workflow finalization).
- Default values:
  - Existing backend defaults apply.
- Migration notes:
  - No schema migration expected for initial slice; if scope changes, add forward/rollback migration notes before implementation.

## Permissions contract

- Roles allowed:
  - Dealer for product edit flow.
  - Admin/ops role for selected support workflow.
- Roles denied:
  - Non-admin roles for admin workflow.
- Audit/logging expectations:
  - Existing API request logs capture actor and endpoint usage; add notes if admin workflow requires enhanced audit detail.

## Acceptance criteria

- [x] Contract drafted before implementation.
- [x] Step 15 behavior IDs reviewed and approved.
- [x] Dealer mobile edit parity behavior marked `active` after implementation + tests.
- [x] Admin baseline workflow behavior marked `active` after implementation + tests.

## Test plan

- Unit tests:
  - Shared payload shaping/validation for edit/admin input where practical.
- Integration tests:
  - Dealer product edit happy path + validation failure + auth boundary.
- Manual smoke checks:
  - Dealer edit required fields flow on device.
  - Admin selected workflow happy path and one permission failure check.

## Rollout and compatibility

- Rollout strategy:
  - Merge in small Step 15 slices with CI validation and pilot-first verification.
- Backward compatibility notes:
  - Preserve Step 14 stable flows; do not regress create/delete/stock paths.
- Monitoring signals:
  - API error rates for dealer edit/admin endpoints, manual smoke pass trend.
- Rollback plan:
  - Revert latest Step 15 slice PR and continue on Step 14 baseline.

## Traceability

- Related PRs: TBD
- Related commits: TBD
- Related docs:
  - `docs/features/MIGRATION_STEP15_POST_PILOT_HARDENING_AND_ADMIN_BASELINE.md`
  - `docs/features/MIGRATION_STEP14_PARITY_WAVE2_AND_PILOT.md`
  - `docs/module-tracklist.md`
- Related tickets: TBD
