import { createNativeApiClient } from '@supplysync/core';
import { router } from 'expo-router';
import { secureStorage } from './storage';

const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export const api = createNativeApiClient({
  baseUrl: backendUrl,
  storage: secureStorage,
  getCurrentRouteName: () => '',
  navigateToLogin: ({ isAdminRoute }) => {
    router.replace(isAdminRoute ? '/admin/login' : '/login');
  },
});
