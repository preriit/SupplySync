# Step 15 — Pending manual tests

Automated gate for Step 15: root `npm run validate` (already passed when Step 15 was closed).

The checks below are **recommended** before pilot/production reliance on Step 15 UX paths. Run them when convenient and record pass/fail + date/tester here.

## Status

- [ ] Mobile — product edit parity (full ID pickers + save/cancel)
- [ ] Admin web — user suspend/activate hardening (confirm, loading, errors)

## Environment

- Backend URL: _______________
- Tester: _______________
- Date: _______________
- Web admin URL: _______________
- Mobile: Expo Go / dev build / mobile web (circle one)

---

## 1) Mobile — product edit parity

Path: Inventory → subcategory → product detail → **Edit**.

| # | Scenario | Pass/Fail | Notes |
|---|----------|-----------|-------|
| 1 | Open edit; surface/application/body/quality chips load (no infinite spinner after refs load) | | |
| 2 | Change one attribute chip each → **Save** → detail/read-only view shows updated labels where applicable | | |
| 3 | Edit → change fields → **Cancel** → form resets to last loaded product | | |
| 4 | Edit → clear one required attribute → **Save** → user-visible validation message (no silent failure) | | |
| 5 | Optional: simulate API error → message surfaces and app stays usable | | |

---

## 2) Admin web — user activation / suspension

Path: Admin login → **User Management** (`AdminUsers`).

| # | Scenario | Pass/Fail | Notes |
|---|----------|-----------|-------|
| 1 | **Suspend** on non-admin user → confirmation dialog → success toast → row shows suspended | | |
| 2 | **Activate** same user → confirmation → success → row shows active | | |
| 3 | While request in flight, button shows updating/disabled state (no double-submit) | | |
| 4 | Force failure (e.g. invalid token or backend error) → toast shows server `detail` when present | | |
| 5 | Search/filter → empty table shows “no users found” message when applicable | | |

---

## Evidence

- Screenshots or short clips (optional): _______________

## Sign-off

- Tester initials: _______________
- Ready for broader pilot: Yes / No / With caveats: _______________
