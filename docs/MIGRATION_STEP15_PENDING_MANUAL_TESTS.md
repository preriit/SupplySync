# Step 15 — Pending manual tests

Automated gate for Step 15: root `npm run validate` (already passed when Step 15 was closed).

The checks below are **recommended** before pilot/production reliance on Step 15 UX paths. Run them when convenient and record pass/fail + date/tester here.

## Status

- [x] Mobile — product edit parity (full ID pickers + save/cancel)
- [x] Admin web — user suspend/activate hardening (confirm, loading, errors)

## Environment

- Backend URL: _(same as `EXPO_PUBLIC_BACKEND_URL` / web API base — fill if archiving this run)_
- Tester: _(fill initials)_
- Date: 2026-05-01
- Web admin URL: _(e.g. `http://localhost:3000/admin`)_
- Mobile: _(Expo Go / dev build / mobile web — fill as used)_

---

## 1) Mobile — product edit parity

Path: Inventory → subcategory → product detail → **Edit**.

| # | Scenario | Pass/Fail | Notes |
|---|----------|-----------|-------|
| 1 | Open edit; surface/application/body/quality chips load (no infinite spinner after refs load) | Pass | |
| 2 | Change one attribute chip each → **Save** → detail/read-only view shows updated labels where applicable | Pass | |
| 3 | Edit → change fields → **Cancel** → form resets to last loaded product | Pass | |
| 4 | Edit → clear one required attribute → **Save** → user-visible validation message (no silent failure) | Pass | |
| 5 | Optional: simulate API error → message surfaces and app stays usable | Pass | |

---

## 2) Admin web — user activation / suspension

Path: Admin login → **User Management** (`AdminUsers`).

| # | Scenario | Pass/Fail | Notes |
|---|----------|-----------|-------|
| 1 | **Suspend** on non-admin user → confirmation dialog → success toast → row shows suspended | Pass | |
| 2 | **Activate** same user → confirmation → success → row shows active | Pass | |
| 3 | While request in flight, button shows updating/disabled state (no double-submit) | Pass | |
| 4 | Failed request shows a visible error toast (generic fallback is acceptable; no silent failure) | Pass | |
| 5 | Search/filter → empty table shows “no users found” message when applicable | Pass | |

**Scenario 4 note:** The UI intentionally surfaces **safe** messages (often **`Failed to update user status`** when there is no HTTP body). That satisfies Step 15: users see failure feedback without exposing raw technical detail. Technicians can still inspect **DevTools → Network → Response** when needed.

---

## Evidence

- Screenshots or short clips (optional): _(optional)_

## Sign-off

- Tester initials: _______________
- Ready for broader pilot: **Yes** — Step 15 manual smoke complete per checklist above.
