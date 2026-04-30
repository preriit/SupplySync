# Migration Step 4 - Platform Adapters

## Objective
Finalize compatibility adapters so the shared API/auth policy can run on both web and native runtimes with platform-specific storage and navigation.

## Implemented
- Native storage adapter factory:
  - `packages/core/src/storage/nativeStorage.js`
  - Added `createNativeStorageAdapter(driver)` for pluggable secure storage drivers
- Native API client adapter:
  - `packages/core/src/api/createNativeApiClient.js`
  - Adapts route resolution and unauthorized redirect to mobile navigation callbacks
- Core API hardening:
  - `packages/core/src/api/createApiClient.js`
  - Added safe fallback storage to avoid runtime failures during partial wiring
- Exports updated:
  - `packages/core/src/index.js`

## Integration contract for mobile app
Mobile app can now wire adapters like:
- `storage`: any driver that provides `getItem`, `setItem`, `removeItem` (for example SecureStore wrappers)
- `getCurrentRouteName`: returns current route/screen
- `navigateToLogin`: callback invoked on unauthorized token expiry

## Example usage sketch
```js
import {
  createNativeApiClient,
  createNativeStorageAdapter,
} from '@supplysync/core';

const secureStorage = createNativeStorageAdapter({
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
});

const api = createNativeApiClient({
  baseUrl: process.env.EXPO_PUBLIC_BACKEND_URL,
  storage: secureStorage,
  getCurrentRouteName: () => navRef.getCurrentRoute()?.name || '',
  navigateToLogin: ({ isAdminRoute }) => {
    router.replace(isAdminRoute ? '/admin/login' : '/login');
  },
});
```

## Step 4 status
- [x] Web adapter available
- [x] Native adapter available
- [x] Shared API client is runtime-agnostic
- [ ] Mobile app wiring to real SecureStore and router (next)
