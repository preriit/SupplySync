# Contract: Inventory History Normalization

## Contract metadata

- Contract Name: Inventory History Normalization
- Domain: Inventory / Product Detail / Ledger Trust
- Owner: Product + Backend
- Reviewers: Frontend + QA
- Created On: 2026-04-30
- Last Updated: 2026-04-30

## Problem and intent

- Problem statement: Migrated historical ledger data can produce misleading negative baselines and confusing operation trails.
- User/business outcome: Dealers can trust stock history and understand who changed stock and how.
- In scope:
  - normalized transaction history output
  - UI display improvements in product history
  - reconciliation metadata visibility
- Out of scope:
  - retroactive destructive edits of all historical raw records without approval

## Behavior matrix

| Behavior ID | Scenario | Expected Behavior | Status | Introduced in | Deprecated in | Obsolete in | Replaced by | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| INV-HIST-001 | User opens product transaction history | API supports normalized transaction view for timeline consistency | active | Phase 1 |  |  |  | Query supports normalized mode |
| INV-HIST-002 | User reviews "By" identity | Display should prefer mapped user identity, not raw phone-like username when possible | active | Phase 1 |  |  |  | Fallback chain applies |
| INV-HIST-003 | Historical migration gap exists | UI may show reconciliation gap indicator while keeping records readable | active | Phase 1 |  |  |  | Trust/compliance visibility |
| INV-HIST-004 | Recent stock history row shown | Operations render as `+` (green) and `-` (red) with quantity unit | active | Phase 1 |  |  |  | Example: `+ 102 boxes` |
| INV-HIST-005 | Date displayed in history UI | Date format is `DD/MM/YYYY`; time format remains unchanged | active | Phase 1 |  |  |  | Applied in current operational views |

## Functional contract

### Inputs

- Actor(s): dealer, manager
- Preconditions: authenticated access to merchant-scoped product
- Trigger/action: user opens product detail or transaction history dialog
- Data inputs: product transactions, user identities, optional reconciliation fields

### Outputs

- User-visible output:
  - readable transaction trail
  - consistent signs/colors for stock operations
  - date and time formatting consistency
- System output:
  - normalized fields for history views
  - identity mapping fallback logic
- Persistence side effects:
  - none for read path
  - reconciliation tooling may generate reports and controlled corrective entries when explicitly run

### Errors and edge cases

- Validation failures: invalid product ID returns not found
- Permission failures: merchant-scope access denied for unauthorized users
- Data anomalies: missing user mapping falls back to available identifier
- Fallback behavior: if normalized metadata unavailable, render base history safely without crash

## API contract

### Endpoint

- Method: GET
- Path: `/dealer/products/{product_id}/transactions`
- Auth: dealer/manager token, merchant-scoped

### Request shape

```json
{
  "normalized": true
}
```

### Response shape

```json
{
  "transactions": [
    {
      "id": "uuid",
      "transaction_type": "add",
      "quantity": 10,
      "quantity_before": 50,
      "quantity_after": 60,
      "created_at": "2026-04-29T12:30:00Z",
      "created_by": "user@example.com"
    }
  ],
  "normalized_reconciliation_gap": 0
}
```

### Error shape

```json
{
  "detail": "Product not found"
}
```

## UI contract

- Screens/components affected:
  - `frontend/src/pages/ProductDetail.js`
  - `frontend/src/pages/ProductsList.js` (history dialog)
- States:
  - loading, empty history, populated history
- Labels/formatting rules:
  - `+` for add (green), `-` for subtract (red)
  - quantity unit displayed (`boxes`)
  - date format `DD/MM/YYYY`
- Accessibility requirements:
  - contrast-safe color usage and text-based sign indicators

## Permissions contract

- Roles allowed: dealer, manager (as per existing merchant read access behavior)
- Roles denied: unauthorized and cross-merchant actors
- Audit/logging expectations: standard API access logs plus reconciliation report artifacts

## Acceptance criteria

- [ ] Product history view returns and renders normalized rows when requested.
- [ ] "By" value uses mapped identity fallback rules instead of raw phone-like values where available.
- [ ] Recent history rows show `+/-` with green/red operation styling and units.
- [ ] Date format in updated history UI is `DD/MM/YYYY` with unchanged time style.
- [ ] Reconciliation gap metadata is available for trust signaling.

## Test plan

- Unit tests:
  - reconciliation analyzer behavior for mixed legacy data
- Integration tests:
  - product history endpoint response shape in normalized mode
- Manual smoke checks:
  - open product history for migrated and non-migrated products
  - verify operation signs/colors and date formatting

## Rollout and compatibility

- Rollout strategy:
  - safe rollout using normalized read path first
  - controlled apply path via reconciliation runner after validation
- Backward compatibility notes:
  - base history remains available; normalized mode is additive
- Monitoring signals:
  - history endpoint errors
  - mismatch reports in reconciliation outputs
- Rollback plan:
  - disable normalized UI toggle/path and fall back to raw history

## Traceability

- Related docs:
  - `docs/CHANGELOG_PHASE1.md`
  - `backend/reports/transaction_reconciliation_summary.csv`
  - `backend/reports/transaction_reconciliation_rows.csv`
  - `backend/reports/transaction_reconciliation_issues.csv`

