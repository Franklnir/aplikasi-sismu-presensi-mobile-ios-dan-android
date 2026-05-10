import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = 'edusmart.mobile.cookies.';

type CookieMap = Record<string, string>;

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

  constructor(private readonly namespace: string) {}

  private get storageKey() {
    return `${STORAGE_PREFIX}${this.namespace}`;
  }

  async load() {
    const raw = await AsyncStorage.getItem(this.storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as CookieMap;
      if (parsed && typeof parsed === 'object') this.cookies = parsed;
    } catch {
      this.cookies = {};
    }
  }

  async clear() {
    this.cookies = {};
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
    await AsyncStorage.setItem(this.storageKey, JSON.stringify(this.cookies));
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
