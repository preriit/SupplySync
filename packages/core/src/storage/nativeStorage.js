const inMemoryStorage = new Map();

export function createNativeStorageAdapter(driver) {
  return {
    async getItem(key) {
      const value = await driver.getItem(key);
      return value ?? null;
    },

    async setItem(key, value) {
      await driver.setItem(key, value);
    },

    async removeItem(key) {
      await driver.removeItem(key);
    },
  };
}

export const nativeStorage = createNativeStorageAdapter({
  async getItem(key) {
    return inMemoryStorage.has(key) ? inMemoryStorage.get(key) : null;
  },
  async setItem(key, value) {
    inMemoryStorage.set(key, value);
  },
  async removeItem(key) {
    inMemoryStorage.delete(key);
  },
});
