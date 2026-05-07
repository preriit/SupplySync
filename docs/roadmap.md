# SupplySync Roadmap (12 Weeks)

This roadmap is intentionally lightweight. Reprioritize weekly based on user feedback and metric movement.

## Executive Summary (Migration Status)

### What has been done
- We set up a shared monorepo structure so web, mobile, and shared packages can evolve together.
- Core logic (API client behavior, auth/session helpers, and form validation) is now centralized in shared packages.
- Mobile parity wave 1 is implemented for critical dealer journeys: login, dashboard, inventory list, product detail, and stock updates.
- PR quality gates are active and now validate shared packages, web build/tests, and mobile web build.
- Stabilization tests were added for shared core logic and key web smoke paths.

### What is pending
- Complete and record the manual mobile smoke checklist for the current stabilization cycle.
- Expand automated coverage beyond smoke tests (more integration-style tests for high-risk flows).
- Progress to parity wave 2 (next highest-value dealer/admin workflows).
- Continue hardening CI and release discipline as test coverage grows.
- Mobile UX direction: see `docs/MOBILE_UX_WAVE2.md`.
- Adaptive dealer report logic and API behavior contract: see `docs/contracts/RPT-ADAPT_adaptive-dealer-reports.md`.
- Transaction history window and Phase 2 export plan: see `docs/TRANSACTION_HISTORY_POLICY.md`.
- Image strategy for future search/matching/reporting: see `docs/IMAGE_INTELLIGENCE_FUTURE_PLAYBOOK.md`.

### Why this matters (plain terms)
- We can now build many features once in shared code, instead of rewriting logic per platform.
- This reduces delivery time, reduces bugs, and keeps user behavior more consistent across web and mobile.
- Quality checks now catch breakages earlier in pull requests before they reach production.

### Expected outcome
- A stable single-codebase operating model where:
  - shared business logic is reused across web and mobile,
  - critical user journeys work consistently across platforms,
  - and each release is gated by reliable automated checks.
- Business impact target: lower regression rate, faster release cycle, and gradual improvement in stockout-related outcomes.

### Next 2-4 week focus
- Close Step 12 stabilization with documented smoke results.
- Merge remaining parity gaps (Wave 2).
- Add targeted automated tests for top business-critical flows.
- Keep PRs small, measurable, and merge-ready.

## Planning Rules
- Keep sprint length to 1 week (or 2 weeks max).
- Build in vertical slices (frontend/mobile + backend + tracking).
- Ship to pilot users early and iterate fast.

## Phase 1: Foundation (Weeks 1-4)
**Goal:** Make inventory visibility trustworthy.

- Inventory item model hardening and data quality checks.
- Core stock movement logging (inbound, outbound, adjustments).
- Baseline dashboards: current stock, low-stock, movement history.
- Basic role/auth stability for operations users.
- Instrumentation for baseline metrics.

**Exit Criteria**
- Pilot users can trust current stock numbers.
- End-to-end stock updates are consistent and auditable.

## Phase 2: Actionability (Weeks 5-8)
**Goal:** Turn visibility into operational action.

- Low-stock rules and alerting.
- Reorder suggestions (rule-based, simple and explainable).
- Supplier and purchase order workflow (create, track, receive).
- Exception handling for delayed/partial receipts.

**Exit Criteria**
- Teams can act on shortages with clear next steps.
- Reorder cycle time begins improving in pilot accounts.

## Phase 3: Optimization (Weeks 9-12)
**Goal:** Improve decision quality and efficiency.

- Better demand heuristics and seasonality-aware guidance.
- Inventory health views (aged stock, dead stock risks).
- Priority queues for daily operational actions.
- Pilot-to-broader rollout playbook.

**Exit Criteria**
- Measurable improvement in stockout rate and fill rate.
- Stable release process for broader adoption.

## Weekly Review Checklist
- What was shipped?
- What changed in key metrics?
- What did users struggle with?
- What should be deprioritized?
- Top 3 priorities for next cycle.

## Revision Log
- 2026-04-30: Initial 12-week roadmap created.
