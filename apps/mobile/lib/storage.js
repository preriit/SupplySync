import { createNativeStorageAdapter } from '@supplysync/core';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const webStorageDriver = {
  async getItem(key) {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    return window.localStorage.getItem(key);
  },
  async setItem(key, value) {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(key, value);
  },
  async removeItem(key) {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.removeItem(key);
  },
};

const secureStoreDriver = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

export const secureStorage = createNativeStorageAdapter(
  Platform.OS === 'web' ? webStorageDriver : secureStoreDriver
);
