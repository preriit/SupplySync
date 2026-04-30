const DEALER_DEFAULTS = {
  tokenKey: 'token',
  userKey: 'user',
};

const ADMIN_DEFAULTS = {
  tokenKey: 'admin_token',
  userKey: 'admin_user',
};

function safeParseJson(rawValue) {
  if (!rawValue) {
    return {};
  }

  try {
    return JSON.parse(rawValue);
  } catch (_error) {
    return {};
  }
}

export function createSessionManager(storage, options = {}) {
  const dealerSession = { ...DEALER_DEFAULTS, ...(options.dealer || {}) };
  const adminSession = { ...ADMIN_DEFAULTS, ...(options.admin || {}) };

  const resolveSession = (scope) => (scope === 'admin' ? adminSession : dealerSession);

  return {
    async setSession({ token, user, scope = 'dealer' }) {
      const { tokenKey, userKey } = resolveSession(scope);
      if (token) {
        await storage.setItem(tokenKey, token);
      }
      await storage.setItem(userKey, JSON.stringify(user || {}));
    },

    async clearSession(scope = 'dealer') {
      const { tokenKey, userKey } = resolveSession(scope);
      await storage.removeItem(tokenKey);
      await storage.removeItem(userKey);
    },

    async getToken(scope = 'dealer') {
      const { tokenKey } = resolveSession(scope);
      return storage.getItem(tokenKey);
    },

    async getUser(scope = 'dealer') {
      const { userKey } = resolveSession(scope);
      const rawUser = await storage.getItem(userKey);
      return safeParseJson(rawUser);
    },
  };
}
