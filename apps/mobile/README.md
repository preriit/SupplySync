# Mobile App Workspace

This folder is the new mobile application target for Android and iOS using Expo + React Native.

## Current status
- Expo app in `app/` with shared `@supplysync/core` auth/API patterns
- Dealer experience: **`DealerTabBar`** (Dashboard, Inventory, Reports, Profile — navy `#0B1F3A`, orange active state), **`DealerMenuSheet`** (left drawer, same navy family, Ionicons beside rows, Log out), **`DealerAppBar`** / **`DealerStackHeader`** for consistent top chrome
- Web app remains in `frontend`

## Planned next actions
1. Continue Wave 2 items from `docs/MOBILE_UX_WAVE2.md` (inventory cards, product detail sticky actions, stock sheet polish)
2. Optional: consolidate duplicated theme hex values into a single theme module (`DESIGN_SYSTEM` parity)

## Local Networking Standard (Practical Setup)

Use HTTP in local development for stability and fast iteration. Keep full HTTPS requirements for staging/production.

### Mode A: Expo Go on phone (manual mobile smoke)

- Set `EXPO_PUBLIC_BACKEND_URL=http://<laptop-lan-ip>:8001` in `apps/mobile/.env`.
- Start backend bound to all interfaces (`0.0.0.0`) so phone can reach it.
- Start Expo with LAN first: `npm run start -- --lan --clear`.
- If LAN discovery is flaky, retry with tunnel for app loading only: `npm run start -- --tunnel --clear`.

### Mode B: Web-in-browser smoke (`w`)

- Avoid HTTPS tunnel page when backend is HTTP, because browsers block mixed content.
- Use an HTTP web origin (LAN/local): `npm run start -- --lan --clear` then press `w`.
- Keep `EXPO_PUBLIC_BACKEND_URL` on HTTP for local backend.

## Known-good local smoke sequence

From repository root:

1. Start backend at `http://0.0.0.0:8001` (or equivalent command in your backend setup).
2. Validate mobile prereqs: `npm run mobile:smoke`.
3. Start Expo for manual testing: `npm run mobile:start -- --lan --clear`.
4. Phone smoke: scan QR in Expo Go and run login -> dashboard -> inventory -> product detail -> stock update.
5. Web smoke: press `w` in Expo terminal and verify login/dashboard on HTTP origin.

## Troubleshooting

- Mixed-content error (`https://...exp.direct` -> `http://...`): use LAN/local HTTP origin for web smoke, or move backend to HTTPS.
- Expo Go opens but login spins: confirm backend logs on submit; if no request arrives, it is connectivity/routing. If request arrives and hangs, debug backend auth path.
- Phone cannot reach API: confirm same Wi-Fi, no VPN, backend port open, and `http://<laptop-ip>:8001/docs` opens on phone browser.
- Stale environment/QR session: restart Expo with `--clear`, then force close Expo Go and scan fresh QR.
