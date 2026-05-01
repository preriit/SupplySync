# Step 12 Manual Mobile Smoke Results

Date: 2026-04-30
Branch/Context: Post-merge sanity on `main`

## Scope

Checklist requested:
- Login
- Dashboard
- Inventory list
- Product detail
- Stock update

## Results

- **Automated pre-checks (completed):**
  - `npm run validate` passed, including:
    - shared package validations
    - shared core automated tests
    - web build + smoke tests
    - mobile deterministic smoke script
    - mobile web export build
  - Local rerun on 2026-04-30: `cd apps/mobile && npm run smoke:ci` -> passed (`mobile smoke checks passed`)
  - Local rerun on 2026-04-30 (post networking standard): `npm run mobile:smoke` -> passed

- **Manual device-driven smoke (requires phone/emulator interaction):**
  - Login: Pass
  - Dashboard: Pass
  - Inventory list: Pass
  - Product detail: Pass
  - Stock update: Pass

## Notes

### Practical local networking standard (adopted)

- Use HTTP backend in local dev and keep HTTPS requirements for staging/production.
- Expo Go on phone:
  - `EXPO_PUBLIC_BACKEND_URL=http://<laptop-lan-ip>:8001`
  - Start Expo with LAN first: `npm run mobile:start -- --lan --clear`
  - Use tunnel only when LAN discovery is unstable.
- Web smoke (`w`):
  - Use HTTP origin (LAN/local), not HTTPS tunnel page, when backend is HTTP.
  - Avoid mixed-content flow (`https` frontend -> `http` backend), which browsers block.

### Known-good command order

1. Start backend bound to all interfaces (`0.0.0.0`) on port `8001`.
2. Run prereq check: `npm run mobile:smoke`.
3. Start Expo: `npm run mobile:start -- --lan --clear`.
4. Run manual flow in Expo Go and web (`w`) against HTTP origin.

### Troubleshooting quick checks

- Mixed content in browser: switch to LAN/local HTTP origin or run backend with HTTPS.
- Expo Go login spinner: inspect backend logs at submit time; if no request appears, it is network/routing.
- API reachability on phone: verify `http://<laptop-ip>:8001/docs` opens on mobile browser.
- Stale session/cache: restart Expo with `--clear`, force close Expo Go, scan fresh QR.

### Latest manual batch (2026-04-30)

- Tester initials: not provided
- Reported outcome:
  - Login: Fail
  - Dashboard: Not run
  - Inventory list: Not run
  - Product detail: Not run
  - Stock update: Not run
- Notes: `Login request timed out. Check backend logs, API URL, and network, then retry.`

### Latest manual batch (2026-04-30, follow-up)

- Tester initials: not provided
- Reported outcome:
  - Login: Fail on Expo Go (while login works on laptop/web and `/docs` opens on mobile)
  - Dashboard: Not run
  - Inventory list: Not run
  - Product detail: Not run
  - Stock update: Not run
- Notes: mobile browser can reach backend docs on LAN; Expo Go login still fails.

### Latest manual batch (2026-04-30, final pass)

- Tester initials: PM
- Reported outcome:
  - Login: Pass
  - Dashboard: Pass
  - Inventory list: Pass
  - Product detail: Pass
  - Stock update: Pass
- Notes: none provided
