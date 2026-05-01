# SupplySync Debug Playbook

Use this playbook for every bug, error, and production issue.

## Debug Playbook (Default)

1. **Capture the issue first (5-10 min)**
   - Log the issue in your tracker or note with:
     - Where it happened (`backend`, `frontend`, `apps/mobile`)
     - Exact error message/screenshot
     - Steps to reproduce
     - Expected vs actual behavior
     - Environment (local/staging/prod)
   - Assign severity:
     - `P0`: data loss, security risk, complete flow broken
     - `P1`: major feature degraded, high user impact
     - `P2`: minor issue, workaround exists

2. **Reproduce before touching code**
   - Reproduce on demand with clear steps.
   - If not reproducible:
     - add more logs/telemetry
     - collect request payloads and boundary inputs
     - do not ship blind fixes

3. **Contain impact quickly (if needed)**
   - For `P0/P1`, reduce blast radius first:
     - disable/guard feature path
     - rollback recent risky change if safe
     - add temporary validation to stop bad writes
   - Containment is temporary, not the final fix.

4. **Trace root cause systematically**
   - Follow request flow in order:
     - Input -> validation -> service logic -> DB/external call -> response -> UI state
   - Check:
     - recent merges and migrations
     - null/undefined handling
     - auth/permission checks
     - race conditions/timezone/number parsing
   - Write one-line root cause statement before fixing.

5. **Define fix contract**
   - What exact behavior changes after fix?
   - Which files/modules are touched?
   - Any schema/API/type impact?
   - What regression test will fail before and pass after?

6. **Implement smallest safe fix**
   - Prefer minimal, targeted changes over refactors.
   - Keep interfaces stable unless contract change is required.
   - If contract changes, update related types and consumers.

7. **Test before close**
   - Required:
     - Repro scenario now passes
     - One regression test added/updated
     - Adjacent happy path still works
   - For `P0/P1`:
     - run extra sanity on related modules
     - verify no data integrity side effects

8. **Release and monitor**
   - Deploy with caution (pilot or staged rollout when possible).
   - Monitor logs, error rate, and affected business metric.
   - Keep issue open until stability window passes.

9. **Close with debug note**
   - Record:
     - Root cause
     - Fix summary
     - Test evidence
     - Prevention action
   - Mark status: `Done` only after monitoring confirms stability.

## Non-Negotiable Rules

- No fix without reproducible case (or added instrumentation to make it reproducible).
- No `Done` without regression coverage (automated preferred, manual checklist minimum).
- Fix root cause, not just visible symptom.
- For `P0/P1`, contain first, then fix.
- If blocked for more than 1 day, log blocker + owner + next action + ETA.

## Fast Severity Response

- `P0` (Immediate): contain in under 1 hour, then hotfix.
- `P1` (Today): triage now, fix same day if possible.
- `P2` (Planned): bundle in next focused bug window.

## Quick Reusable Debug Checklist

Copy this per issue:

- [ ] Repro steps documented
- [ ] Severity assigned (`P0/P1/P2`)
- [ ] Impact containment applied (if needed)
- [ ] Root cause identified
- [ ] Fix contract defined
- [ ] Minimal safe fix implemented
- [ ] Repro passes after fix
- [ ] Regression test/check added
- [ ] Post-release monitoring done
- [ ] Debug closure note added

## Suggested Bug Note Template

Use this in your issue tracker or markdown note:

- **Issue:** <short title>
- **Severity:** P0/P1/P2
- **Area:** backend/frontend/mobile/db
- **Repro steps:** <numbered steps>
- **Expected:** <expected behavior>
- **Actual:** <actual behavior>
- **Root cause:** <one-line statement>
- **Fix:** <what changed>
- **Tests:** <what was validated>
- **Prevention:** <guardrail/log/test added>
- **Status:** Open / Monitoring / Done

