/**
 * Encrypted storage for the Supabase auth session (access + refresh tokens).
 *
 * Plain AsyncStorage is an unencrypted file inside the app's data folder. On a
 * rooted phone, or via a device backup, anyone could copy the refresh token and
 * sign in as the user.
 *
 * The session is too large for SecureStore's limit (~2 KB), so this follows
 * Supabase's recommended "LargeSecureStore" pattern:
 *   - a random 256-bit AES key per entry lives in expo-secure-store, which is
 *     backed by the Android Keystore / iOS Keychain;
 *   - only the AES-encrypted value is written to AsyncStorage.
 * Without the Keystore-held key the copied file is useless.
 *
 * On web there is no Keystore, so it falls back to AsyncStorage (localStorage).
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as aesjs from 'aes-js';

const KEY_PREFIX = 'sb-key.';
const VALUE_PREFIX = 'sb-enc.';

// SecureStore keys may only contain alphanumerics, ".", "-" and "_".
const secureKeyName = (key: string) => KEY_PREFIX + key.replace(/[^A-Za-z0-9._-]/g, '_');

const secureOptions: SecureStore.SecureStoreOptions = {
  // Readable only while the phone is unlocked, and never restored to another device.
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

async function encrypt(key: string, value: string): Promise<string> {
  const encryptionKey = Crypto.getRandomBytes(256 / 8);
  const counter = Crypto.getRandomBytes(16);
  const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(counter));
  const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
  await SecureStore.setItemAsync(secureKeyName(key), aesjs.utils.hex.fromBytes(encryptionKey), secureOptions);
  return aesjs.utils.hex.fromBytes(counter) + ':' + aesjs.utils.hex.fromBytes(encrypted);
}

async function decrypt(key: string, payload: string): Promise<string | null> {
  const keyHex = await SecureStore.getItemAsync(secureKeyName(key), secureOptions);
  const sep = payload.indexOf(':');
  if (!keyHex || sep <= 0) return null;
  const counter = aesjs.utils.hex.toBytes(payload.slice(0, sep));
  const data = aesjs.utils.hex.toBytes(payload.slice(sep + 1));
  const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(keyHex), new aesjs.Counter(counter));
  return aesjs.utils.utf8.fromBytes(cipher.decrypt(data));
}

export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return AsyncStorage.getItem(key);
    try {
      const payload = await AsyncStorage.getItem(VALUE_PREFIX + key);
      if (!payload) {
        // One-time cleanup: sessions saved by older builds were stored in plaintext.
        if (await AsyncStorage.getItem(key)) await AsyncStorage.removeItem(key);
        return null;
      }
      return await decrypt(key, payload);
    } catch {
      return null; // corrupted or key missing -> treated as signed out
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') return AsyncStorage.setItem(key, value);
    const payload = await encrypt(key, value);
    await AsyncStorage.setItem(VALUE_PREFIX + key, payload);
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') return AsyncStorage.removeItem(key);
    await AsyncStorage.removeItem(VALUE_PREFIX + key);
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(secureKeyName(key), secureOptions).catch(() => {});
  },
};
