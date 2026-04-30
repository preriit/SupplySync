# Beta Readiness Checklist

Use this checklist before inviting pilot users to the cross-platform beta.

## Product Readiness

- [ ] Core dealer journeys work on web and mobile:
  - [ ] Login/logout
  - [ ] Dashboard load
  - [ ] Inventory list load
  - [ ] Product detail load
  - [ ] Stock add/subtract update reflected correctly
- [ ] Shared auth/session behavior matches across web and mobile.
- [ ] Validation errors are clear and consistent.

## Quality and Testing

- [ ] `npm run validate` passes on `main`.
- [ ] Shared core tests pass (`packages/core`).
- [ ] Web smoke tests pass (`frontend`).
- [ ] Mobile smoke script passes (`apps/mobile/scripts/smoke-check.mjs`).
- [ ] Manual mobile smoke run is recorded with date and tester.

## Operations and Release

- [ ] PR quality gates are green for all release-bound PRs.
- [ ] Rollback path is documented (revert PR / disable rollout slice).
- [ ] Known issues list is prepared for pilot communication.
- [ ] Owner assigned for beta monitoring and incident response.

## Metrics and Support

- [ ] Baseline metrics captured before beta (stockout rate, fill rate, key flow success).
- [ ] Error monitoring/log review routine defined (daily for pilot window).
- [ ] Feedback channel and response SLA defined.

## Sign-off

- [ ] Engineering sign-off
- [ ] Product sign-off
- [ ] Operations sign-off

Revision log:
- 2026-04-30: Initial beta readiness checklist added.
