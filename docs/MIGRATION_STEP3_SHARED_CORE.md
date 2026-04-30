# Migration Step 3 - Shared Core Extraction

## Objective
Extract shared API/auth session logic from the web app into `packages/core` so both web and mobile can reuse it.

## Changes completed
- Added shared API factory:
  - `packages/core/src/api/createApiClient.js`
- Added web-specific adapter:
  - `packages/core/src/api/createWebApiClient.js`
- Added storage adapters:
  - `packages/core/src/storage/webStorage.js`
  - `packages/core/src/storage/nativeStorage.js`
- Exported modules from:
  - `packages/core/src/index.js`
- Updated frontend wrapper to use shared core:
  - `frontend/src/utils/api.js`
- Added axios dependency for shared package:
  - `packages/core/package.json`

## Behavior parity retained
- Preserves existing backend base URL normalization
- Keeps admin/dealer token separation (`admin_token` vs `token`)
- Preserves 401 handling and login route redirects
- Keeps all existing frontend imports (`import api from '../utils/api'`) unchanged

## Why this matters
- Frontend now validates real consumption of shared core package.
- Mobile can reuse the same API/auth policy with a native storage/navigation adapter.

## Next Step 3 follow-up
- Add a native API client entry using secure storage + mobile navigation redirects.
- Point the upcoming Expo app login flow to the same shared API layer.
