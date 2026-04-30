# Migration Step 6 - Shared Session State

## Objective
Unify auth session handling so web and mobile use the same token/user storage contract from the shared core package.

## Implemented
- Added shared session manager:
  - `packages/core/src/auth/session.js`
  - Exposes `createSessionManager(storage, options?)`
- Updated core exports:
  - `packages/core/src/index.js`
- Web login now uses shared session write:
  - `frontend/src/pages/LoginPage.js`
- Web dealer logout now uses shared session clear:
  - `frontend/src/components/DealerNav.js`
- Mobile login now uses shared session write:
  - `apps/mobile/app/login.js`
- Mobile dashboard now uses shared session read/clear:
  - `apps/mobile/app/dashboard.js`

## Shared contract
`createSessionManager` supports:
- `setSession({ token, user, scope })`
- `getToken(scope)`
- `getUser(scope)`
- `clearSession(scope)`

Supported scopes:
- `dealer` (default): `token`, `user`
- `admin`: `admin_token`, `admin_user`

## Why this helps migration
- Removes duplicate token/user handling logic from web/mobile screens
- Keeps storage backend interchangeable (web localStorage vs native SecureStore adapter)
- Establishes a reusable auth/session core before broader feature migration

## Remaining follow-up
- Move remaining direct `localStorage` reads/writes in web dealer/admin screens to shared session manager incrementally.
