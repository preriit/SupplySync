# Behavior Contracts Index

This file is the master tracker for behavior contracts across SupplySync.

## How to use

- Add one row per contract file.
- Keep status and versions updated whenever behavior changes.
- Do not remove old entries; change status to `obsolete` when retired.

## Registry

| Contract ID | Contract Name | File | Owner | Current Status | Introduced | Deprecated | Obsolete | Replaced By |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| INV-HIST | Inventory History Normalization | `docs/contracts/INV-HIST_normalized-transaction-history.md` | Product + Backend | active | Phase 1 |  |  |  |
| STEP15 | Post-Pilot Hardening and Admin Baseline | `docs/contracts/STEP15_post-pilot-hardening-and-admin-baseline.md` | Engineering | active | Step 15 |  |  |  |

## Status definitions

- `draft`: proposed and not yet approved
- `active`: approved and expected in production
- `deprecated`: supported but scheduled for replacement/removal
- `obsolete`: retired behavior kept for historical record

