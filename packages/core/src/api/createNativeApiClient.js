import { createApiClient } from './createApiClient.js';

export function createNativeApiClient({
  baseUrl,
  storage,
  getCurrentRouteName,
  navigateToLogin,
} = {}) {
  return createApiClient({
    baseUrl,
    storage,
    getPathname: () => {
      const routeName = getCurrentRouteName ? getCurrentRouteName() : '';
      return routeName ? `/${routeName}` : '/';
    },
    onUnauthorized: ({ isAdminRoute }) => {
      if (navigateToLogin) {
        navigateToLogin({ isAdminRoute });
      }
    },
  });
}
