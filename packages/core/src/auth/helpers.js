const DEALER_DEFAULTS = {
  tokenKey: 'token',
  userKey: 'user',
};

const ADMIN_DEFAULTS = {
  tokenKey: 'admin_token',
  userKey: 'admin_user',
};

function safeParseUser(rawValue) {
  if (!rawValue) {
    return {};
  }
  try {
    return JSON.parse(rawValue);
  } catch (_error) {
    return {};
  }
}

function resolveKeys(scope, options = {}) {
  const dealer = { ...DEALER_DEFAULTS, ...(options.dealer || {}) };
  const admin = { ...ADMIN_DEFAULTS, ...(options.admin || {}) };
  return scope === 'admin' ? admin : dealer;
}

export function hasValidSessionToken(tokenValue) {
  return typeof tokenValue === 'string' && tokenValue.trim().length > 0;
}

export function requireRole(user, allowedRoles = []) {
  if (allowedRoles.length === 0) {
    return true;
  }
  return allowedRoles.includes(user?.user_type);
}

export function createAuthHelpers(sessionManager) {
  return {
    async getCurrentUser(scope = 'dealer') {
      return sessionManager.getUser(scope);
    },
    async isAuthenticated(scope = 'dealer') {
      const token = await sessionManager.getToken(scope);
      return hasValidSessionToken(token);
    },
    async requireRole(allowedRoles = [], scope = 'dealer') {
      const user = await sessionManager.getUser(scope);
      return requireRole(user, allowedRoles);
    },
  };
}

export function createWebAuthHelpers(storage, options = {}) {
  return {
    getCurrentUser(scope = 'dealer') {
      const { userKey } = resolveKeys(scope, options);
      return safeParseUser(storage.getItem(userKey));
    },
    getToken(scope = 'dealer') {
      const { tokenKey } = resolveKeys(scope, options);
      return storage.getItem(tokenKey);
    },
    isAuthenticated(scope = 'dealer') {
      const token = this.getToken(scope);
      return hasValidSessionToken(token);
    },
    requireRole(allowedRoles = [], scope = 'dealer') {
      return requireRole(this.getCurrentUser(scope), allowedRoles);
    },
  };
}
