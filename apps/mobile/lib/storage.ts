import * as SecureStore from 'expo-secure-store';

// Lightweight async key/value for non-secret UI preferences (theme, locale,
// primary currency). Backed by SecureStore so we don't add another storage dep.
export const storage = {
  async get(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // best-effort
    }
  },
  async remove(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // best-effort
    }
  },
};

export const STORAGE_KEYS = {
  theme: 'uchetka.pref.theme',
  locale: 'uchetka.pref.locale',
  currency: 'uchetka.pref.currency',
  weekStartsOn: 'uchetka.pref.weekStartsOn',
} as const;
