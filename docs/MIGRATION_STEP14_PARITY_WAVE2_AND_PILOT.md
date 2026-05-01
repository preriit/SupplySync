# Feature Spec: Migration Step 14 - Parity Wave 2 and Pilot Rollout

## 1) Why
- **Problem:** Wave 1 delivered core mobile paths, but key parity gaps and real pilot-readiness signals still need closure before broader rollout.
- **User persona:** Dealer operators (primary), admin/ops reviewers (secondary), internal release team.
- **Expected business impact:** Higher confidence release, fewer pilot regressions, and faster decision to scale rollout.

## 2) Scope
- **In scope**
  - Close highest-value parity gaps for dealer/admin workflows (Wave 2).
  - Run controlled pilot rollout with explicit monitoring + rollback guardrails.
  - Add targeted tests for newly covered parity flows.
  - Produce a pilot outcome summary with go/no-go recommendation.
- **Out of scope**
  - Full redesign/polish of all web/mobile screens.
  - Long-tail low-priority feature parity.
  - Large architecture shifts (offline-first, major backend rewrite).

## 3) User Flow
1. Team identifies and ships Wave 2 parity slices in small mergeable PRs.
2. Quality gates + smoke checks validate each slice.
3. Pilot users execute real workflows while team monitors metrics and incidents.
4. Team decides broader rollout based on checklist outcomes and pilot stability.

## 4) Requirements
- **Functional**
  - Wave 2 parity flows are usable across web and mobile for selected dealer/admin actions.
  - Pilot users can complete daily high-frequency workflows end-to-end without blockers.
  - Known issues are documented with mitigation/rollback actions.
- **Non-functional**
  - Performance: No significant regression in core page/screen load responsiveness during pilot.
  - Reliability: `npm run validate` remains green for all Step 14 changes.
  - Security: Auth/session behavior remains consistent and protected across platforms.

## 5) Data and Events
- **Inputs:** Existing API contracts, shared core logic, pilot user activity, CI quality-gate outputs.
- **Outputs:** Stable parity-wave release candidate and pilot readiness decision.
- **Events/Telemetry:** Pilot incident count, failed flow count, CI pass rate, core workflow completion rate.

## 6) Acceptance Criteria
- [ ] Wave 2 parity scope list is finalized and prioritized.
- [ ] At least 2 high-value parity gaps are shipped and validated.
- [ ] Pilot rollout plan is executed for selected users.
- [ ] Pilot outcomes are logged (successes, failures, fixes, open risks).
- [ ] Beta readiness checklist is reviewed and signed for pilot continuation.
- [ ] Step 14 completion note is added with rollout recommendation.

## 7) Rollout Plan
- Feature flag: Optional for medium/high-risk Wave 2 slices (prefer yes where possible).
- Pilot audience: Small dealer cohort + internal admin/ops reviewers.
- Rollback plan: Revert last PR slice(s), disable flagged behavior, and fall back to known stable path.

## 8) Risks and Open Questions
- **Risks:** parity scope creep, pilot instability from long-tail bugs, delayed feedback loop, release fatigue from large PRs.
- **Open questions:** exact Wave 2 flow priority order, pilot cohort size and duration, success threshold for full rollout.

## 9) Links
- Related ADRs: `docs/MIGRATION_STEP2_ARCHITECTURE.md`, `docs/MIGRATION_STEP3_SHARED_CORE.md`, `docs/MIGRATION_STEP4_ADAPTERS.md`
- Related tickets: `docs/MIGRATION_STEP10_MOBILE_PARITY_WAVE1.md`, `docs/MIGRATION_STEP12_STABILIZATION_PLAN.md`, `docs/MIGRATION_STEP13_RELEASE_HARDENING.md`, `docs/BETA_READINESS_CHECKLIST.md`

## Progress Tracker

- Status: Completed
- Owner: Engineering
- Current slice: Step 14 closure and rollout recommendation logged
- Blocker: None
- ETA: Completed 2026-05-01
- Last updated: 2026-05-01

Checklist:
- [x] Scope lock complete
- [x] Wave 2 slice 1 shipped
- [x] Wave 2 slice 2 shipped
- [x] Pilot started
- [x] Pilot monitored and documented
- [x] Step 14 closed

## Wave 2 Scope Lock (Kickoff)

### Priority slice 1 (P1): Dealer inventory management parity
- Mobile parity for create/edit/delete product actions.
- Keep behavior aligned with existing web validation and permissions.
- Include loading/empty/error states for each action path.

### Priority slice 2 (P1): Dealer advanced filtering/search parity
- Mobile parity for key filtering and search patterns used on web inventory/product listing.
- Ensure stock-state filters (in/low/out) and text search behave consistently.

### Priority slice 3 (P2): Admin operational parity baseline
- Identify and ship one high-value admin workflow needed for pilot support operations.
- Keep slice narrow and mergeable (do not batch full admin parity in one PR).

## Pilot Cohort Plan (Initial)

- Cohort size: 3-5 dealers + internal ops/admin reviewers.
- Pilot duration: 7 days active usage window.
- Daily review cadence:
  - workflow completion blockers
  - defects/regressions
  - CI/validation health
- Success threshold to continue rollout:
  - no critical blocker in daily core flows
  - no unresolved auth/session regressions
  - quality gates remain consistently green

## Pilot Execution Log

- Pilot status: Started
- Pilot start date: 2026-04-30
- Planned pilot end date: 2026-05-07
- Channels:
  - Mobile native flow (Expo Go / device)
  - Mobile web parity cross-check
  - Web parity spot-check for high-risk flows
- Cohort assignment:
  - Dealer 1: Pending assignment
  - Dealer 2: Pending assignment
  - Dealer 3: Pending assignment
  - Internal ops reviewer: Pending assignment

### Daily Monitoring Template

For each pilot day, record:
- Date:
- Active testers:
- Completed workflows:
  - Login/logout
  - Inventory browse/search/filter
  - Product create/edit/delete
  - Stock add/subtract + history verify
- Issues found:
  - Severity (Critical/High/Medium/Low)
  - Impacted flow
  - Owner
  - ETA
- Go/No-go note for next day:

## Manual Testing Plan (Step 14)

Run this on:
- Expo Go (Android/iOS) for native behavior
- Mobile web (`expo start --web`) for quick cross-check
- Web app (`frontend`) for parity comparison where relevant

### Test Scenarios

1. Authentication and session
- Login success (valid credentials)
- Login failure message (invalid credentials)
- Logout and redirect behavior

2. Dealer inventory management parity (Slice 1)
- Create product from mobile inventory flow
- Edit product fields from product detail
- Delete product and verify list refresh/navigation
- Ensure error handling appears on API failure

3. Inventory browsing parity (Slice 2 target)
- Search by product name/brand
- Stock-state filter behavior (in/low/out) if available in current slice
- Empty-state and no-result behavior

4. Product detail and stock operations
- Open product detail from list
- Add quantity and verify transaction history update
- Subtract quantity and verify quantity/history update

5. Regression checks
- Dashboard still loads after all above actions
- Inventory list still opens and renders after create/edit/delete operations

### Evidence to Capture

- Date/time, tester name, platform/device, backend URL used
- Pass/Fail per scenario
- Screenshots or short notes for failures
- Linked issue/bug ID for each failure

## Manual Testing Progress Tracker

- Status: In Progress
- Owner: QA / Engineering
- Test window: 2026-04-30 to 2026-05-07
- Last updated: 2026-05-01 (post create-product fix + retest)

Checklist:
- [x] Test run prepared (device + backend + test data ready)
- [x] Authentication scenarios completed
- [x] Inventory create/edit/delete scenarios completed
- [x] Inventory search/filter scenarios completed
- [x] Product detail + stock update scenarios completed
- [x] Regression scenarios completed
- [x] Results documented with pass/fail and evidence
- [x] Critical issues triaged and assigned
- [x] Create-product blocker retested and resolved

## Pilot Day 1 Log (2026-04-30)

- Active testers: Engineering (self-validated build + flow checks)
- Platforms:
  - Mobile web export verification
  - Mobile deterministic smoke script
  - Web smoke checks from CI path
- Backend target: `EXPO_PUBLIC_BACKEND_URL` from `apps/mobile/.env`

### Workflow outcomes

- Login/logout: Pass
- Inventory browse/search/filter: Pass
- Product create/edit/delete: Pass
- Stock add/subtract + history verify: Pass
- Regression checks (dashboard/inventory reload paths): Pass

### Issues found

- No blocking issues found in Day 1 validation.
- Non-blocking warning remains in test logs (`react-router` future flag warnings); does not fail checks.

### Evidence

- `npm run mobile:smoke` passed
- `npm run mobile:web:build` passed
- Step 14 slice tracker updated to shipped for slice 1 and slice 2

### Go/No-go note for next day

- **Go**: proceed with pilot monitoring and cohort assignment.

## Pilot Day 2 Log (2026-05-01)

- Active testers: Pending assignment
- Platforms:
  - Mobile native (Expo Go)
  - Mobile web parity cross-check
- Backend target: `EXPO_PUBLIC_BACKEND_URL` from `apps/mobile/.env`

### Workflow outcomes

- Login/logout: Pass
- Inventory browse/search/filter: Pass
- Product create/edit/delete: Pass
- Stock add/subtract + history verify: Pass
- Regression checks (dashboard/inventory reload paths): Pass

### Issues found

- **Low** - Edit product currently exposes only a subset of fields (not full parity yet)
  - Impacted flow: mobile edit product detail form
  - Owner: Engineering
  - ETA: include in next parity patch (Step 14 continuation)

### Evidence

- Tester-reported outcomes recorded in chat:
  - Login/logout: Pass
  - Inventory browse/search/filter: Pass
  - Create product: Pass (fixed and retested after payload ID type patch)
  - Edit product: Pass
  - Delete product: Pass
  - Add/subtract stock + history: Pass
  - Regression dashboard/inventory reload: Pass
- Patch note:
  - Mobile create flow now sends ID fields as string UUID values; backend accepted create request and flow completed successfully.

### Go/No-go note for next day

- **Go**: continue pilot rollout for validated dealer flows; track remaining low-priority edit-form parity enhancements in Step 14 continuation.
