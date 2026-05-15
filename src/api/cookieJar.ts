import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const STORAGE_PREFIX = 'edusmart.mobile.cookies.';

type CookieMap = Record<string, string>;

const secureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const splitSetCookieHeader = (header: string) => {
  const parts: string[] = [];
  let current = '';
  let inExpires = false;

  for (let i = 0; i < header.length; i += 1) {
    const char = header[i];
    const lookBehind = header.slice(Math.max(0, i - 8), i).toLowerCase();
    if (lookBehind.endsWith('expires=')) inExpires = true;
    if (inExpires && char === ';') inExpires = false;

    if (char === ',' && !inExpires) {
      const rest = header.slice(i + 1);
      if (/^\s*[^=;,\s]+=/.test(rest)) {
        if (current.trim()) parts.push(current.trim());
        current = '';
        continue;
      }
    }
    current += char;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
};

const parseCookie = (raw: string) => {
  const [pair] = raw.split(';');
  const separatorIndex = pair.indexOf('=');
  if (separatorIndex <= 0) return null;
  const name = pair.slice(0, separatorIndex).trim();
  const value = pair.slice(separatorIndex + 1).trim();
  if (!name) return null;
  return { name, value };
};

export class CookieJar {
  private cookies: CookieMap = {};
  private secureStoreAvailable: boolean | null = null;

  constructor(private readonly namespace: string) {}

  private get storageKey() {
    return `${STORAGE_PREFIX}${this.namespace}`;
  }

  private async canUseSecureStore() {
    if (this.secureStoreAvailable !== null) return this.secureStoreAvailable;
    try {
      this.secureStoreAvailable = await SecureStore.isAvailableAsync();
    } catch {
      this.secureStoreAvailable = false;
    }
    return this.secureStoreAvailable;
  }

  private parseStoredCookies(raw: string | null) {
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw) as CookieMap;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  private async persist() {
    const raw = JSON.stringify(this.cookies);
    if (await this.canUseSecureStore()) {
      await SecureStore.setItemAsync(this.storageKey, raw, secureStoreOptions);
      await AsyncStorage.removeItem(this.storageKey);
      return;
    }
    await AsyncStorage.setItem(this.storageKey, raw);
  }

  async load() {
    if (await this.canUseSecureStore()) {
      const secureRaw = await SecureStore.getItemAsync(this.storageKey, secureStoreOptions);
      this.cookies = this.parseStoredCookies(secureRaw);
      if (Object.keys(this.cookies).length > 0) return;

      const legacyRaw = await AsyncStorage.getItem(this.storageKey);
      const legacyCookies = this.parseStoredCookies(legacyRaw);
      if (Object.keys(legacyCookies).length > 0) {
        this.cookies = legacyCookies;
        await this.persist();
      }
      return;
    }

    const raw = await AsyncStorage.getItem(this.storageKey);
    this.cookies = this.parseStoredCookies(raw);
  }

  async clear() {
    this.cookies = {};
    if (await this.canUseSecureStore()) {
      await SecureStore.deleteItemAsync(this.storageKey, secureStoreOptions);
    }
    await AsyncStorage.removeItem(this.storageKey);
  }

  async absorb(headers: Headers) {
    const raw = headers.get('set-cookie');
    if (!raw) return;
    const cookies = splitSetCookieHeader(raw).map(parseCookie).filter(Boolean);
    cookies.forEach((cookie) => {
      if (!cookie) return;
      if (cookie.value === '') {
        delete this.cookies[cookie.name];
      } else {
        this.cookies[cookie.name] = cookie.value;
      }
    });
    await this.persist();
  }

  header() {
    return Object.entries(this.cookies)
      .filter(([, value]) => value !== '')
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  xsrfToken() {
    const token = this.cookies['XSRF-TOKEN'];
    if (!token) return '';
    try {
      return decodeURIComponent(token);
    } catch {
      return token;
    }
  }
}
