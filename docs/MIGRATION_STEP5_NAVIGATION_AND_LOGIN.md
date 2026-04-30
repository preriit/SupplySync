# Migration Step 5 - Navigation and Login Wiring

## Objective
Wire the first end-to-end mobile flow using Expo Router and the shared core API adapter.

## Implemented
- Expo runtime config:
  - `apps/mobile/app.json`
  - `apps/mobile/babel.config.js`
- Mobile dependencies updated:
  - `apps/mobile/package.json` now includes `@supplysync/core`, `expo-secure-store`, `expo-status-bar`
- Routing bootstrap:
  - `apps/mobile/app/_layout.js`
  - `apps/mobile/app/index.js`
  - `apps/mobile/app/admin/login.js` (redirect shim)
- Shared adapter integration:
  - `apps/mobile/lib/storage.js` (SecureStore-based storage adapter)
  - `apps/mobile/lib/api.js` (native API client from shared core)
- First authenticated flow:
  - `apps/mobile/app/login.js`
  - `apps/mobile/app/dashboard.js`

## Behavior now
- App lands on `/login`
- Login calls `/auth/login` using shared `@supplysync/core` API logic
- On success, token/user are stored in secure storage and app navigates to `/dashboard`
- Logout clears secure storage and routes back to `/login`

## Step 5 done criteria
- [x] Mobile routing initialized
- [x] Login screen calls backend via shared API layer
- [x] Session token stored using native-capable storage adapter
- [ ] Validate on Android emulator/device
- [ ] Validate on iOS simulator/device
