# Feature Spec: Single Codebase Migration (Web + Android + iOS)

## 1) Why
- **Problem:** Right now, product changes are costly and slow when logic is duplicated across platforms. We want one shared foundation so features are faster to ship and easier to maintain.
- **User persona:** Internal product/engineering team, and indirectly dealers/admin users who need stable, same-behavior apps on web and mobile.
- **Expected business impact:** Faster release cycles, fewer cross-platform bugs, and more consistent user experience.

## 2) Scope
- **In scope**
  - Move shared logic (API calls, auth/session behavior, validation) into reusable packages.
  - Bring key dealer workflows to mobile with parity to web.
  - Add CI quality gates so shared/web/mobile checks run on PRs.
  - Add stabilization tests for shared core and critical web user journeys.
  - Add release-hardening checks (shared integration tests, mobile deterministic smoke, beta readiness checklist).
- **Out of scope**
  - Full redesign of all screens.
  - Advanced offline-first architecture in this phase.
  - Full E2E automation across all devices in this phase.

## 3) User Flow
1. Developer implements feature once in shared/core where possible.
2. Web and mobile consume shared logic with platform-specific UI wrappers.
3. PR checks validate shared package, web build/test, and mobile web build.
4. Team merges only when quality gates and smoke checks pass.

## 4) Requirements
- **Functional**
  - Shared auth/session/validation logic must behave the same on web and mobile.
  - Dealer must be able to log in, view dashboard/inventory, open product detail, and update stock on mobile.
  - PR pipeline must reject regressions in shared/web/mobile validations.
- **Non-functional**
  - Performance: Build/test cycle should stay practical for daily development (single-command validation available).
  - Reliability: Shared behaviors (login/session/role checks) should be covered by automated tests.
  - Security: Token handling must remain platform-appropriate (web storage vs secure/native adapter paths).

## 5) Data and Events
- **Inputs:** Existing FastAPI backend APIs, auth tokens, dealer/admin profile/session data, inventory/product APIs.
- **Outputs:** Consistent web/mobile behavior and successful CI check results for every PR.
- **Events/Telemetry:** PR check outcomes, build/test pass rate, migration milestone completion notes.

## 6) Acceptance Criteria
- [x] Monorepo/workspace structure created for web, mobile, shared core, and shared UI.
- [x] Shared core contains API adapters, session/auth helpers, and validation schemas.
- [x] Mobile app supports core dealer flow parity wave 1 (dashboard, inventory, product detail, stock updates).
- [x] CI workflow runs shared validation + web build/test + mobile web build on PRs.
- [x] Stabilization tests added for shared core and web smoke paths.
- [x] Manual mobile smoke checklist is executed and logged for current stabilization PR (completed on 2026-04-30; see `docs/MIGRATION_STEP12_MOBILE_SMOKE_RESULTS.md`).
- [x] Team confirms merge readiness and closes Step 12 officially (PR #2 merged, checks green, post-merge `npm run validate` passed).
- [ ] Step 13 release hardening is merged to `main` (tracking in `docs/MIGRATION_STEP13_RELEASE_HARDENING.md`).

## 7) Rollout Plan
- Feature flag: No (rollout is phased by migration steps and PR-based slices).
- Pilot audience: Internal team first, then selected dealer users (controlled rollout).
- Rollback plan: Revert the specific PR/step if regression appears; shared logic is isolated in packages for targeted rollback.

## 8) Risks and Open Questions
- **Risks:**
  - Version compatibility drift between React/React Native/router/tooling can break CI unexpectedly.
  - Mobile behavior parity can lag if web-only assumptions leak into shared logic.
  - Build/test time can grow and slow iteration if not kept lean.
- **Open questions:**
  - Should we add a lightweight mobile automated smoke runner next, or stay with manual checklist for one more phase?
  - Do we want stricter CI policy on warnings, or keep warning-tolerant tests for now?
  - Which dealer/admin flows should be prioritized in parity wave 2?

## 9) Links
- Related ADRs: `docs/MIGRATION_STEP2_ARCHITECTURE.md`, `docs/MIGRATION_STEP3_SHARED_CORE.md`, `docs/MIGRATION_STEP4_ADAPTERS.md`
- Related tickets: Migration steps tracked in:
  - `docs/MIGRATION_STEP5_NAVIGATION_AND_LOGIN.md`
  - `docs/MIGRATION_STEP6_SHARED_SESSION.md`
  - `docs/MIGRATION_STEP7_WEB_AUTH_GUARDS.md`
  - `docs/MIGRATION_STEP9_SHARED_AUTH_HELPERS.md`
  - `docs/MIGRATION_STEP10_MOBILE_PARITY_WAVE1.md`
  - `docs/MIGRATION_STEP12_STABILIZATION_PLAN.md`
  - `docs/MIGRATION_STEP13_RELEASE_HARDENING.md`
