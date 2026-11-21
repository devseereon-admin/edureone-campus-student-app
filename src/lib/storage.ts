import * as SecureStore from 'expo-secure-store';

/**
 * Credentials live in the iOS Keychain / Android Keystore-backed storage,
 * never in plain AsyncStorage. Values are only readable after the device has
 * been unlocked once since boot.
 */
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export const KEYS = {
  token: 'edureon.access_token',
  session: 'edureon.session',
  biometric: 'edureon.biometric_lock',
  pushToken: 'edureon.push_token',
} as const;

export async function getItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key, OPTIONS);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value, OPTIONS);
}

export async function removeItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key, OPTIONS);
  } catch {
    /* already gone */
  }
}

export async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const setJSON = (key: string, value: unknown) => setItem(key, JSON.stringify(value));
