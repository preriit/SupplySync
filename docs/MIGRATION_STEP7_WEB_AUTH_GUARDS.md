# Migration Step 7 - Web Auth Guards and Admin Session

## Objective
Migrate critical web auth control points away from direct `localStorage` usage to shared core session/storage abstractions.

## Implemented
- Route guards now read from shared web storage adapter:
  - `frontend/src/App.js`
  - `ProtectedRoute` and `AdminProtectedRoute` use `webStorage`
- Admin login now writes session via shared session manager:
  - `frontend/src/pages/AdminLogin.js`
  - Uses `createSessionManager(webStorage).setSession(..., scope: 'admin')`
- Admin logout now clears session via shared session manager:
  - `frontend/src/components/AdminLayout.js`
  - Uses `createSessionManager(webStorage).clearSession('admin')`

## Why this matters
- Core auth gate behavior is no longer tightly coupled to browser APIs.
- Web and mobile now follow the same session contract in login/logout paths.
- Keeps route protection behavior stable while migration proceeds incrementally.

## Second pass completed
- Replaced remaining runtime `localStorage` reads in dealer pages with `webStorage`:
  - `frontend/src/components/DealerNav.js`
  - `frontend/src/pages/DealerDashboard.js`
  - `frontend/src/pages/ProductsList.js`
  - `frontend/src/pages/SubCategoriesList.js`
  - `frontend/src/pages/ProductDetail.js`
  - `frontend/src/pages/DealerProfile.js`
- Replaced remaining runtime admin token reads with `webStorage`:
  - `frontend/src/pages/AdminDashboard.js`
  - `frontend/src/pages/AdminUsers.js`
  - `frontend/src/pages/AdminMerchants.js`
  - `frontend/src/pages/AdminReferenceData.js`

## Remaining note
- `frontend/src/pages/AdminReferenceData.js.backup` still contains legacy `localStorage` usage, but it is a backup file and not used in runtime.
