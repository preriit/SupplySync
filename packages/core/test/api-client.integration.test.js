import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient } from '../src/api/createApiClient.js';

function createInMemoryStorage(initial = {}) {
  const memory = new Map(Object.entries(initial));
  return {
    async getItem(key) {
      return memory.get(key) ?? null;
    },
    async setItem(key, value) {
      memory.set(key, value);
    },
    async removeItem(key) {
      memory.delete(key);
    },
  };
}

test('createApiClient appends /api to base URL when missing', () => {
  const client = createApiClient({ baseUrl: 'http://localhost:8001' });
  assert.equal(client.defaults.baseURL, 'http://localhost:8001/api');
});

test('createApiClient keeps /api when already present', () => {
  const client = createApiClient({ baseUrl: 'http://localhost:8001/api' });
  assert.equal(client.defaults.baseURL, 'http://localhost:8001/api');
});

test('request interceptor injects dealer token on non-admin route', async () => {
  const storage = createInMemoryStorage({ token: 'dealer-token' });
  const client = createApiClient({
    storage,
    getPathname: () => '/dealer/dashboard',
  });
  const requestInterceptor = client.interceptors.request.handlers[0].fulfilled;

  const config = await requestInterceptor({ headers: {} });
  assert.equal(config.headers.Authorization, 'Bearer dealer-token');
});

test('request interceptor injects admin token on admin route', async () => {
  const storage = createInMemoryStorage({ admin_token: 'admin-token' });
  const client = createApiClient({
    storage,
    getPathname: () => '/admin/dashboard',
  });
  const requestInterceptor = client.interceptors.request.handlers[0].fulfilled;

  const config = await requestInterceptor({ headers: {} });
  assert.equal(config.headers.Authorization, 'Bearer admin-token');
});

test('response interceptor clears dealer session and calls unauthorized handler on 401', async () => {
  const storage = createInMemoryStorage({
    token: 'dealer-token',
    user: JSON.stringify({ id: 1 }),
  });
  const unauthorizedCalls = [];
  const client = createApiClient({
    storage,
    getPathname: () => '/dealer/inventory',
    onUnauthorized: (payload) => unauthorizedCalls.push(payload),
  });
  const responseRejected = client.interceptors.response.handlers[0].rejected;

  await assert.rejects(() =>
    responseRejected({
      response: { status: 401 },
      config: { url: '/dealer/subcategories' },
    })
  );

  assert.equal(await storage.getItem('token'), null);
  assert.equal(await storage.getItem('user'), null);
  assert.deepEqual(unauthorizedCalls, [{ isAdminRoute: false }]);
});

test('response interceptor skips clearing session for login 401', async () => {
  const storage = createInMemoryStorage({
    token: 'dealer-token',
    user: JSON.stringify({ id: 1 }),
  });
  const unauthorizedCalls = [];
  const client = createApiClient({
    storage,
    getPathname: () => '/dealer/login',
    onUnauthorized: (payload) => unauthorizedCalls.push(payload),
  });
  const responseRejected = client.interceptors.response.handlers[0].rejected;

  await assert.rejects(() =>
    responseRejected({
      response: { status: 401 },
      config: { url: '/auth/login' },
    })
  );

  assert.equal(await storage.getItem('token'), 'dealer-token');
  assert.equal(await storage.getItem('user'), JSON.stringify({ id: 1 }));
  assert.deepEqual(unauthorizedCalls, []);
});
