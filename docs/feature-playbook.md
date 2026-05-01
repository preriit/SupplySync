# SupplySync Feature Playbook

Use this as the default execution system for any new feature in SupplySync.

## Feature Playbook (Default)

1. **Create feature brief first (10-20 min)**
   - Create `docs/features/<feature-name>.md` (copy from `docs/features/FEATURE-TEMPLATE.md`).
   - Define:
     - Goal and user persona
     - Core behavior rules
     - Edge cases
     - Acceptance criteria
     - Rollout/rollback note

2. **Define contract before code (15-30 min)**
   - API contract:
     - Route(s), method, request payload, response payload
     - Validation rules
     - Error codes/messages
   - Data contract:
     - DB change needed? (table/column/index)
     - Migration plan (forward + rollback safety)
   - Type contract:
     - Update shared/request-response types in the relevant shared API/type modules used by `frontend` and `apps/mobile`.

3. **Plan the first vertical slice**
   - Pick the smallest shippable flow that can be used end-to-end.
   - Slice must include:
     - Data/model path
     - Backend API path
     - One usable UI path (`frontend` or `apps/mobile`, based on priority)
   - Add it to `docs/module-tracklist.md` as `In Progress`.

4. **Implement in strict order**
   - Migration/schema (if required)
   - Backend: model/DTO/service/controller
   - Frontend/mobile: screen/page + integration
   - UX states: loading, empty, validation, error, retry

5. **Test before calling it done**
   - API tests:
     - Happy path
     - Key validation failures
     - One authorization/permission check if applicable
   - UI tests or manual test checklist:
     - Core journey completes successfully
     - Loading/empty/error states behave correctly
   - Sanity check adjacent module to avoid regressions.

6. **Close with review note**
   - Update feature file with:
     - What shipped
     - Contract changes
     - Known limitations
     - Follow-up tasks
   - Update `docs/module-tracklist.md` to `Done` or `Partial`.

## Non-Negotiable Rules

- No feature starts without behavior + contract.
- No feature is done without:
  - error-state handling
  - test coverage (automated where practical, manual checklist minimum)
- Keep max 1-2 `In Progress` features.
- If blocked for more than 1 day, log blocker with owner, next action, ETA.
- Prefer mergeable slices over large batch implementation.
- Ship to pilot users first when feature risk is medium/high.

## SupplySync Definition of Done

A feature is `Done` only when all are true:

- Acceptance criteria checked in `docs/features/<feature-name>.md`
- API/data/type contracts implemented and consistent
- Migration applied and verified (if relevant)
- UI states complete (loading/empty/error)
- Tests executed and passed (or manual checklist attached)
- Tracker status updated
- Short review note added

## Quick Reusable Checklist

Copy this checklist into each feature doc:

- [ ] Behavior drafted
- [ ] API contract drafted
- [ ] Data impact assessed
- [ ] Migration done (if needed)
- [ ] Backend complete
- [ ] Frontend/mobile integration complete
- [ ] Loading/empty/error states done
- [ ] Tests done
- [ ] Review note added
- [ ] Tracker status updated

## Recommended Tracker Format

Maintain `docs/module-tracklist.md` with columns:

- Module/Feature
- Owner
- Status (`Planned` | `In Progress` | `Blocked` | `Partial` | `Done`)
- Current slice
- Blocker (if any)
- ETA
- Last updated

## Daily Operating Loop

1. Pick one feature slice.
2. Build to testable state.
3. Test and record outcome.
4. Update tracker + feature note.
5. Decide next slice (or stop if done).

This loop keeps speed high and context loss low.
