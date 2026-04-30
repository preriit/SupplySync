import test from 'node:test';
import assert from 'node:assert/strict';
import { ZodError } from 'zod';
import {
  buildLoginPayload,
  loginFormSchema,
  signUpFormSchema,
  profileFormSchema,
  createAuthHelpers,
  createWebAuthHelpers,
} from '../src/index.js';

test('buildLoginPayload maps email identifier to email payload', () => {
  const payload = buildLoginPayload('dealer@example.com', 'secret123');
  assert.deepEqual(payload, {
    email: 'dealer@example.com',
    phone: undefined,
    password: 'secret123',
  });
});

test('buildLoginPayload maps phone identifier to phone payload', () => {
  const payload = buildLoginPayload('  +91 9876543210  ', 'secret123');
  assert.deepEqual(payload, {
    email: undefined,
    phone: '+919876543210',
    password: 'secret123',
  });
});

test('buildLoginPayload rejects invalid identifier', () => {
  assert.throws(() => buildLoginPayload('invalid-id', 'secret123'), ZodError);
});

test('loginFormSchema enforces required identifier and password', () => {
  const result = loginFormSchema.safeParse({ identifier: '', password: '' });
  assert.equal(result.success, false);
});

test('signUpFormSchema rejects password mismatch', () => {
  const result = signUpFormSchema.safeParse({
    businessName: 'Demo Tiles',
    ownerName: 'Owner Name',
    mobileNumber: '9876543210',
    city: 'Delhi',
    state: 'Delhi',
    postalCode: '110001',
    email: 'owner@example.com',
    password: 'password123',
    confirmPassword: 'password321',
  });
  assert.equal(result.success, false);
});

test('profileFormSchema validates preferred language and phone format', () => {
  const invalid = profileFormSchema.safeParse({
    username: 'Dealer',
    phone: '12345',
    preferred_language: 'en',
  });
  assert.equal(invalid.success, false);

  const valid = profileFormSchema.safeParse({
    username: 'Dealer',
    phone: '9876543210',
    preferred_language: 'hi',
  });
  assert.equal(valid.success, true);
});

test('createAuthHelpers checks async token, role, and current user', async () => {
  const sessionManager = {
    async getToken() {
      return 'token-123';
    },
    async getUser() {
      return { id: 1, user_type: 'dealer', username: 'Demo Dealer' };
    },
  };
  const helpers = createAuthHelpers(sessionManager);
  assert.equal(await helpers.isAuthenticated(), true);
  assert.equal(await helpers.requireRole(['dealer']), true);
  assert.deepEqual(await helpers.getCurrentUser(), {
    id: 1,
    user_type: 'dealer',
    username: 'Demo Dealer',
  });
});

test('createWebAuthHelpers handles authentication and role checks', () => {
  const store = new Map([
    ['token', ' dealer-token '],
    ['user', JSON.stringify({ user_type: 'dealer', username: 'Web Dealer' })],
  ]);
  const storage = {
    getItem(key) {
      return store.get(key) ?? null;
    },
  };

  const helpers = createWebAuthHelpers(storage);
  assert.equal(helpers.isAuthenticated('dealer'), true);
  assert.equal(helpers.requireRole(['dealer'], 'dealer'), true);
  assert.deepEqual(helpers.getCurrentUser('dealer'), {
    user_type: 'dealer',
    username: 'Web Dealer',
  });
});

test('createWebAuthHelpers returns empty user for malformed JSON', () => {
  const storage = {
    getItem(key) {
      if (key === 'user') return '{bad-json';
      if (key === 'token') return 'token';
      return null;
    },
  };

  const helpers = createWebAuthHelpers(storage);
  assert.deepEqual(helpers.getCurrentUser(), {});
});
