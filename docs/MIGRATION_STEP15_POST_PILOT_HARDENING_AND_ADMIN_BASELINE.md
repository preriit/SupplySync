# Feature Spec: Migration Step 15 - Post-Pilot Hardening and Admin Baseline

## 1) Why
- **Problem:** Step 14 closed major dealer parity gaps, but pilot follow-through still needs one focused hardening pass and one admin support workflow before wider rollout confidence.
- **User persona:** Dealer operators (primary), admin/ops support users (secondary), release owner (internal).
- **Expected business impact:** Fewer pilot support escalations, faster incident resolution, and safer expansion to a broader cohort.

## 2) Scope
- **In scope**
  - Close remaining mobile product edit parity gaps (full field visibility/editability aligned to web).
  - Ship one high-value admin operational workflow for pilot support baseline (admin user activation/suspension control).
  - Lock API/type/UI behavior contracts for Step 15 before implementation.
  - Add targeted tests and manual smoke entries for new Step 15 slices.
- **Out of scope**
  - Full admin parity migration.
  - Broad UI redesign.
  - Offline-first architecture or backend platform rewrite.

## 3) User Flow
1. Team finalizes Step 15 contract and first vertical slice.
2. Engineering ships mobile edit parity hardening, including error/loading states.
3. Engineering ships one admin ops baseline workflow with permission-safe behavior.
4. QA/engineering executes focused smoke checks and logs outcomes.
5. Team records closure note and rollout recommendation update.

## 4) Requirements
- **Functional**
  - Dealer can edit all required product fields on mobile with backend-accepted payloads.
  - Admin/ops can activate or suspend non-admin users end-to-end from admin user management.
  - Shared contracts (API/data/type/UI) stay aligned between web and mobile consumers.
- **Non-functional**
  - Performance: No noticeable regression in mobile inventory/product edit screen responsiveness.
  - Reliability: `npm run validate` remains green for Step 15 merges.
  - Security: Role checks remain enforced for admin paths and dealer product operations.

## 5) Data and Events
- **Inputs:** Existing dealer/admin APIs, shared core API client, pilot defect notes, current parity docs.
- **Outputs:** Stable Step 15 hardening release slice(s) with documented pilot-safe behavior.
- **Events/Telemetry:** Validation pass rate, manual smoke pass/fail, issue severity trend, admin workflow completion signal.

## 6) Acceptance Criteria
- [x] Step 15 behavior + contract docs created before code starts.
- [x] Mobile product edit flow reaches practical parity for required fields and UX states.
- [x] One admin support workflow is implemented and validated.
- [x] API/data/type contracts are updated and documented in `docs/contracts`.
- [x] Tests (automated/manual checklist) are executed and recorded.
- [x] Step 15 tracker is updated with closure recommendation.

## 7) Rollout Plan
- Feature flag: Optional for admin slice if backend risk is medium/high.
- Pilot audience: Existing pilot dealers + internal ops/admin reviewer.
- Rollback plan: Revert Step 15 slice PR(s) and retain Step 14 stable flows.

## 8) Risks and Open Questions
- **Risks:** admin scope creep, parity edge-case misses, test data inconsistencies in pilot environments.
- **Open questions:** which exact admin workflow has highest support value, whether admin slice should be flagged from day one.

## 9) Links
- Related ADRs: `docs/MIGRATION_STEP2_ARCHITECTURE.md`, `docs/MIGRATION_STEP3_SHARED_CORE.md`, `docs/MIGRATION_STEP4_ADAPTERS.md`
- Related tickets: `docs/features/MIGRATION_STEP14_PARITY_WAVE2_AND_PILOT.md`, `docs/BETA_READINESS_CHECKLIST.md`, `docs/module-tracklist.md`
- Pending manual smoke (recommended): `docs/MIGRATION_STEP15_PENDING_MANUAL_TESTS.md`

## Progress Tracker

- Status: Completed
- Owner: Engineering
- Current slice: Closed (review note below)
- Blocker: None
- ETA: Completed 2026-05-01
- Last updated: 2026-05-01

Checklist:
- [x] Behavior drafted
- [x] API contract drafted
- [x] Data impact assessed
- [x] Migration done (if needed) — N/A (no DB migrations for this step)
- [x] Backend complete — N/A (existing dealer/admin APIs only)
- [x] Frontend/mobile integration complete
- [x] Loading/empty/error states done
- [x] Tests done
- [x] Review note added
- [x] Tracker status updated

## Step 15 Execution Stages (Trackable)

1. Stage 0 - Contract lock (completed)
   - Step 15 feature brief and behavior contract created.
   - Contract index and module tracker updated.

2. Stage 1 - Slice planning (completed)
   - Finalize first vertical slice scope:
     - mobile product edit parity completion details
     - admin baseline workflow: user activation/suspension control
   - Confirm API/request-response/role and edge-case contract.

3. Stage 2 - Mobile hardening implementation
   - Implement full required mobile edit-field parity.
   - Complete loading/error/retry/success UX states.

4. Stage 3 - Admin baseline implementation
   - Implement one high-value admin support workflow end-to-end.
   - Verify permission checks and failure handling.

5. Stage 4 - Validation and tests
   - Execute automated checks where practical.
   - Run manual smoke checklist for mobile edit + admin workflow + regressions.
   - Run `npm run validate`.

6. Stage 5 - Pilot monitoring update
   - Log outcomes, defects, severity, owner, ETA.
   - Update Step 15 tracker and module tracklist status.

7. Stage 6 - Closure
   - Add review note (shipped scope, contract changes, known limits, follow-ups).
   - Mark Step 15 done after all acceptance criteria are satisfied.

## Step 15 Stage Tracker

- Last updated: 2026-05-01
- Cadence: Update at end of each implementation/test session.

| Stage | Status | Owner | ETA | Notes |
| --- | --- | --- | --- | --- |
| Stage 0 - Contract lock | Done | Engineering | 2026-05-01 | Feature spec + behavior contract + indexes created |
| Stage 1 - Slice planning | Done | Engineering | 2026-05-01 | Admin baseline workflow selected: user activation/suspension |
| Stage 2 - Mobile hardening implementation | Done | Engineering | 2026-05-01 | Mobile edit includes surface/application/body/quality pickers aligned with web PUT payload |
| Stage 3 - Admin baseline implementation | Done | Engineering | 2026-05-01 | Admin user activation/suspension hardening implemented in `AdminUsers` |
| Stage 4 - Validation and tests | Done | QA/Engineering | 2026-05-01 | Root `npm run validate` passed (core tests, web build/test, mobile smoke + web export) |
| Stage 5 - Pilot monitoring update | Done | QA/Engineering | 2026-05-01 | Closure recorded here; no new pilot blockers from Step 15 slice |
| Stage 6 - Closure | Done | Engineering | 2026-05-01 | Review note added below |

Checklist:
- [x] Stage 0 complete
- [x] Stage 1 complete
- [x] Stage 2 complete
- [x] Stage 3 complete
- [x] Stage 4 complete
- [x] Stage 5 complete
- [x] Stage 6 complete

## Step 15 Pilot / Closure Log (2026-05-01)

- Validation: `npm run validate` completed successfully on developer workstation after Step 15 changes.
- Scope shipped:
  - Mobile product edit parity for attribute IDs + validation (`apps/mobile/app/inventory/[subcategoryId]/products/[productId].js`).
  - Admin user suspend/activate hardening (`frontend/src/pages/AdminUsers.js`).
- Rollout recommendation: **Proceed** with broader rollout prep; keep monitoring dealer inventory flows and admin user actions during pilot expansion.

## Step 15 Review Note

- **Shipped:** Full mobile edit parity for fields carried on `PUT /dealer/products/{id}` (brand, name, sku, packing, surface/application/body/quality IDs) with reference loading and edit UX; admin user status toggle UX hardening with confirmation, disabled state, optimistic UI update, and server error surfacing.
- **Contract changes:** Behavior rows `STEP15-EDIT-*` and `STEP15-ADMIN-001` marked active in `docs/contracts/STEP15_post-pilot-hardening-and-admin-baseline.md`.
- **Known limitations:** Web dealer product detail still includes richer-only UI (images, tabs, activity) not mirrored on mobile; out of scope for Step 15.
- **Follow-ups:** Optional shared component extraction for mobile `OptionPicker` used by add/edit screens; optional RTL manual smoke on admin users page.
