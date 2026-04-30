# Migration Step 9 - Shared Auth Hooks/Helpers

## Objective
Create reusable auth helpers that can be consumed by both web and mobile flows for user/session checks and role gating.

## Implemented
- Added shared auth helper module:
  - `packages/core/src/auth/helpers.js`
- Exported helper APIs from:
  - `packages/core/src/index.js`

## Shared helper APIs
- `hasValidSessionToken(tokenValue)`
- `requireRole(user, allowedRoles)`
- `createAuthHelpers(sessionManager)` (async helpers for cross-platform storage/session managers)
- `createWebAuthHelpers(storage)` (sync helpers for web route guards)

## Integration updates
- Web route guards now use shared auth helpers:
  - `frontend/src/App.js`
  - `ProtectedRoute` and `AdminProtectedRoute` migrated to `createWebAuthHelpers(webStorage)`
- Mobile dashboard now enforces shared auth checks:
  - `apps/mobile/app/dashboard.js`
  - Redirects to login when no dealer session token is present

## Why this helps
- Removes duplicate auth-check logic from app layers
- Keeps role and token checks consistent across platforms
- Prepares for future shared auth hook abstractions (React hook wrappers) without changing validation/session contracts
