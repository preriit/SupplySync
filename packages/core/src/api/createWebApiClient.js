import { createApiClient } from './createApiClient.js';
import { webStorage } from '../storage/webStorage.js';

export function createWebApiClient(baseUrl) {
  return createApiClient({
    baseUrl,
    storage: webStorage,
    getPathname: () => (typeof window === 'undefined' ? '/' : window.location.pathname),
    onUnauthorized: ({ isAdminRoute }) => {
      if (typeof window === 'undefined') {
        return;
      }
      window.location.href = isAdminRoute ? '/admin/login' : '/login';
    },
  });
}
