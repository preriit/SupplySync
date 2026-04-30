# Migration Step 13: Release Hardening + Beta Readiness

Step 13 moves the migration from "working" to "release-ready" by strengthening automated checks, adding deterministic mobile smoke validation, and defining beta exit criteria.

## Goals

- Broaden shared core test coverage with API/client integration-style tests.
- Add repeatable mobile-focused smoke validation that runs in CI.
- Tighten quality gates so release regressions are caught earlier.
- Define a clear beta-readiness checklist for launch decisions.

## Scope

### 1) Shared core hardening (`packages/core`)

- Add integration-style tests for API client behavior:
  - base URL normalization (`/api` suffix rules)
  - dealer/admin token injection behavior by route
  - unauthorized session clear + callback behavior for 401 responses
  - login-401 exception handling (do not clear active session on login failure)

### 2) Mobile deterministic smoke (`apps/mobile`)

- Add a deterministic smoke script to verify:
  - critical mobile flow files exist
  - required mobile backend env is configured (`EXPO_PUBLIC_BACKEND_URL`)
- Make this smoke script callable from root validation.

### 3) CI and release gate tightening

- Include shared core tests in root validation and PR workflow.
- Include mobile deterministic smoke checks in root validation and PR workflow.
- Keep existing web/mobile build checks in place.

### 4) Beta launch readiness artifacts

- Add a practical, stakeholder-friendly beta readiness checklist:
  - product flow readiness
  - quality and test status
  - ops/release safeguards
  - monitoring and support readiness

## Deliverables

- `packages/core/test/api-client.integration.test.js`
- `apps/mobile/scripts/smoke-check.mjs`
- `docs/BETA_READINESS_CHECKLIST.md`
- Updated:
  - root `package.json` (`core:test`, `mobile:smoke`, stricter `validate`)
  - `apps/mobile/package.json` (`smoke:ci`)
  - `.github/workflows/pr-quality-gates.yml` (core tests + mobile smoke)

## CI Expectations

- `npm run validate` must pass on every Step 13 commit.
- PR quality gates must include:
  - shared package validation
  - shared core tests
  - web build + smoke tests
  - mobile smoke script + mobile web export

## Definition of Done

- Shared core integration-style tests added and passing.
- Deterministic mobile smoke script added and passing.
- CI workflow updated to enforce new checks.
- Beta readiness checklist published.
- No new lint errors introduced.

## Progress Tracker

- [x] Shared core integration tests added.
- [x] Mobile deterministic smoke script added.
- [x] Root + CI quality gates tightened.
- [x] Beta readiness checklist documented.
- [ ] Step 13 PR merged to `main`.
