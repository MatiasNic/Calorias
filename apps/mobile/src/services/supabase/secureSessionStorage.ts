import aesjs from 'aes-js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import Storage from 'expo-sqlite/kv-store';

/**
 * Supabase sessions exceed SecureStore's ~2 KB value limit, so we store a random AES-256 key in
 * the Keychain/Keystore and the encrypted session in SQLite (pattern recommended by Supabase).
 */
const keyName = (key: string) => `plato.enc.${key.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

async function encrypt(key: string, value: string): Promise<string> {
  const encryptionKey = Crypto.getRandomValues(new Uint8Array(256 / 8));
  const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
  const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
  await SecureStore.setItemAsync(keyName(key), aesjs.utils.hex.fromBytes(encryptionKey));
  return aesjs.utils.hex.fromBytes(encrypted);
}

async function decrypt(key: string, value: string): Promise<string | null> {
  const hexKey = await SecureStore.getItemAsync(keyName(key));
  if (!hexKey) return null;
  const cipher = new aesjs.ModeOfOperation.ctr(
    aesjs.utils.hex.toBytes(hexKey),
    new aesjs.Counter(1),
  );
  return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(value)));
}

export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    const encrypted = await Storage.getItem(key);
    if (!encrypted) return null;
    try {
      return await decrypt(key, encrypted);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    const encrypted = await encrypt(key, value);
    await Storage.setItem(key, encrypted);
  },
  async removeItem(key: string): Promise<void> {
    await Storage.removeItem(key);
    await SecureStore.deleteItemAsync(keyName(key));
  },
};
