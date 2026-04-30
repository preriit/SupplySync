# Migration Step 12: Stabilization Sprint

Step 11 added quality gates and PR validation. Step 12 focuses on reducing regression risk by adding targeted tests and smoke checks across shared core, web, and mobile.

## Goals

- Add baseline automated tests for shared validation and auth helpers.
- Add practical web smoke tests for critical auth flows.
- Define and execute a repeatable mobile smoke checklist.
- Keep CI signal clean and actionable before the next feature wave.

## Scope

### 1) Shared package tests (`packages/core`)

- Add tests for `buildLoginPayload`:
  - email input -> payload uses `email`, omits `phone`
  - phone input -> payload uses `phone`, omits `email`
  - trims identifier and preserves password
- Add tests for validation schemas:
  - login required fields
  - signup password/confirm mismatch
  - profile required/format constraints
- Add tests for auth helpers:
  - `isAuthenticated` truthy/falsey token cases
  - `requireRole` success/failure cases
  - `getCurrentUser` parsing behavior for invalid/missing JSON

### 2) Web smoke tests (`frontend`)

- Add lightweight tests for:
  - login submit path with valid payload generation
  - signup validation error rendering from shared schema
  - protected route redirect when session token is missing
- Keep initial scope small (3-5 tests), focused on critical paths.

### 3) Mobile smoke checklist (`apps/mobile`)

Manual pass on Expo Go and web:

- login success and error state
- dashboard load and logout
- inventory list load
- product detail load
- stock add/subtract reflects latest quantity

Document pass/fail results in PR description for Step 12.

## CI Expectations

- `npm run validate` remains green on all Step 12 commits.
- New tests run in CI by default (no local-only scripts).
- Any flaky test must be fixed or removed before merge.

## Definition of Done

- Shared core tests added and passing in CI.
- Web smoke tests added and passing in CI.
- Mobile smoke checklist completed and noted in PR.
- No new lint warnings/errors introduced.
