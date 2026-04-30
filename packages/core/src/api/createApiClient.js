import axios from 'axios';

function normalizeApiBaseUrl(rawBaseUrl) {
  const normalizedBaseUrl = (rawBaseUrl || 'http://localhost:8001').replace(/\/+$/, '');
  return normalizedBaseUrl.endsWith('/api')
    ? normalizedBaseUrl
    : `${normalizedBaseUrl}/api`;
}

export function createApiClient({
  baseUrl,
  getPathname,
  storage,
  onUnauthorized,
  adminTokenKey = 'admin_token',
  dealerTokenKey = 'token',
  adminUserKey = 'admin_user',
  dealerUserKey = 'user',
} = {}) {
  const safeStorage = storage || {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  };

  const api = axios.create({
    baseURL: normalizeApiBaseUrl(baseUrl),
    headers: { 'Content-Type': 'application/json' },
  });

  api.interceptors.request.use(async (config) => {
    if (config.headers?.Authorization) {
      return config;
    }

    const pathname = getPathname ? getPathname() : '/';
    const isAdminRoute = pathname.startsWith('/admin');
    const tokenKey = isAdminRoute ? adminTokenKey : dealerTokenKey;
    const token = await safeStorage.getItem(tokenKey);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        const pathname = getPathname ? getPathname() : '/';
        const isAdminRoute = pathname.startsWith('/admin');
        const isLoginUrl = error.config?.url?.includes('/login');

        if (isAdminRoute) {
          const hasAdminToken = await safeStorage.getItem(adminTokenKey);
          if (hasAdminToken && !isLoginUrl) {
            await safeStorage.removeItem(adminTokenKey);
            await safeStorage.removeItem(adminUserKey);
            if (onUnauthorized) {
              onUnauthorized({ isAdminRoute: true });
            }
          }
        } else {
          const hasDealerToken = await safeStorage.getItem(dealerTokenKey);
          if (hasDealerToken && !isLoginUrl) {
            await safeStorage.removeItem(dealerTokenKey);
            await safeStorage.removeItem(dealerUserKey);
            if (onUnauthorized) {
              onUnauthorized({ isAdminRoute: false });
            }
          }
        }
      }
      return Promise.reject(error);
    }
  );

  return api;
}
