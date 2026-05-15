import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { DbRequest, PickedUploadFile, Profile, School, Settings, User } from '../types';
import { appConfig, buildApiBaseUrl } from '../config/schools';
import { CookieJar } from './cookieJar';

const SESSION_SCHOOL_KEY = 'edusmart.mobile.selectedSchool';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 0, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

type Json = Record<string, unknown>;
type QueryParams = Record<string, boolean | number | string | null | undefined>;

const normalizePath = (path: string) => (path.startsWith('/') ? path : `/${path}`);
const mobileClientHeader = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'mobile';

const schoolNamespace = (school: School) => `${school.slug}:${buildApiBaseUrl(school) || 'default'}`;

const buildQueryString = (params?: QueryParams) => {
  const entries = Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (!entries.length) return '';
  const search = new URLSearchParams();
  entries.forEach(([key, value]) => search.set(key, String(value)));
  return `?${search.toString()}`;
};

const getHeader = (headers: Headers, name: string) => {
  try {
    return headers.get(name);
  } catch {
    return null;
  }
};

const parseJson = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

export class EduSmartApi {
  readonly baseUrl: string;
  private csrfReady = false;
  private readonly cookieJar: CookieJar;

  constructor(readonly school: School) {
    this.baseUrl = buildApiBaseUrl(school);
    this.cookieJar = new CookieJar(schoolNamespace(school));
  }

  async init() {
    await this.cookieJar.load();
  }

  async clearSession() {
    this.csrfReady = false;
    await this.cookieJar.clear();
  }

  private commonHeaders(extra?: HeadersInit) {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-EduSmart-Client': mobileClientHeader,
    };
    const cookie = this.cookieJar.header();
    if (cookie) headers.Cookie = cookie;
    const xsrf = this.cookieJar.xsrfToken();
    if (xsrf) headers['X-XSRF-TOKEN'] = xsrf;
    if (appConfig.tenantHeaderEnabled && this.school.slug) {
      headers[appConfig.tenantHeaderName] = this.school.slug;
    }
    if (extra) {
      Object.entries(extra as Record<string, string>).forEach(([key, value]) => {
        if (value !== undefined) headers[key] = String(value);
      });
    }
    return headers;
  }

  private async ensureCsrf(force = false) {
    if (!force && this.csrfReady && this.cookieJar.xsrfToken()) return;
    const response = await fetch(`${this.baseUrl}/sanctum/csrf-cookie`, {
      method: 'GET',
      credentials: 'include',
      headers: this.commonHeaders(),
    });
    await this.cookieJar.absorb(response.headers);
    if (!response.ok) {
      throw new ApiError(`Gagal mengambil CSRF cookie (${response.status})`, response.status);
    }
    this.csrfReady = true;
  }

  async request<T = unknown>(
    path: string,
    options: {
      method?: string;
      body?: unknown;
      headers?: HeadersInit;
      skipCsrf?: boolean;
    } = {},
  ): Promise<T> {
    if (!this.baseUrl) {
      throw new ApiError('Endpoint sekolah tidak valid atau belum diizinkan untuk aplikasi mobile.', 422, 'INVALID_SCHOOL_ENDPOINT');
    }

    const method = String(options.method || 'GET').toUpperCase();
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const shouldUseCsrf = !options.skipCsrf && method !== 'GET' && method !== 'HEAD';

    if (shouldUseCsrf) {
      await this.ensureCsrf();
    }

    const headers = this.commonHeaders(options.headers);
    let body: BodyInit | undefined;

    if (options.body !== undefined && options.body !== null) {
      if (isFormData) {
        body = options.body as BodyInit;
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(options.body);
      }
    }

    let response = await fetch(`${this.baseUrl}${normalizePath(path)}`, {
      method,
      credentials: 'include',
      headers,
      body,
    });
    await this.cookieJar.absorb(response.headers);

    if (response.status === 419 && shouldUseCsrf) {
      this.csrfReady = false;
      await this.ensureCsrf(true);
      const retryHeaders = this.commonHeaders(options.headers);
      if (options.body !== undefined && options.body !== null && !isFormData) {
        retryHeaders['Content-Type'] = 'application/json';
      }
      response = await fetch(`${this.baseUrl}${normalizePath(path)}`, {
        method,
        credentials: 'include',
        headers: retryHeaders,
        body,
      });
      await this.cookieJar.absorb(response.headers);
    }

    const json = await parseJson(response);
    if (!response.ok) {
      const message =
        typeof json === 'object' && json
          ? String((json as Json).error || (json as Json).message || response.statusText)
          : response.statusText || 'Request gagal';
      throw new ApiError(message, response.status, String((json as Json)?.code || ''));
    }

    return json as T;
  }

  async authMe() {
    const raw = await this.request<{ data?: { user?: User; profile?: Profile; settings?: Settings; is_super_admin?: boolean } }>(
      '/api/auth/me',
      { skipCsrf: true },
    );
    return raw.data || null;
  }

  async login(email: string, password: string) {
    const raw = await this.request<{ data?: { user?: User; profile?: Profile; settings?: Settings; is_super_admin?: boolean } }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: { email, password },
      },
    );
    return raw.data || null;
  }

  async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST', body: {} });
    } finally {
      await this.clearSession();
    }
  }

  async db<T = unknown>(request: DbRequest) {
    const raw = await this.request<{ data?: T }>('/api/db', {
      method: 'POST',
      body: {
        action: 'select',
        columns: '*',
        filters: { eq: {}, neq: {}, is: {}, in: {}, gte: {}, lte: {}, gt: {}, lt: {}, ilike: {} },
        order: [],
        limit: null,
        offset: null,
        payload: null,
        onConflict: null,
        ...request,
      },
    });
    return raw.data as T;
  }

  async quizDashboard<T = unknown>(params: QueryParams = {}) {
    const raw = await this.request<{ data?: T }>(`/api/quiz/dashboard${buildQueryString({ page: 1, per_page: 50, client: 'mobile', ...params })}`, {
      skipCsrf: true,
    });
    return raw.data as T;
  }

  async quizDetail<T = unknown>(quizId: string | number, params: QueryParams = {}) {
    const id = encodeURIComponent(String(quizId));
    const raw = await this.request<{ data?: T }>(`/api/quiz/${id}/detail${buildQueryString({ client: 'mobile', ...params })}`, {
      skipCsrf: true,
    });
    return raw.data as T;
  }

  async quizStart<T = unknown>(payload: Record<string, unknown>) {
    const raw = await this.request<{ data?: T }>('/api/quiz/start', {
      method: 'POST',
      body: payload,
    });
    return raw.data as T;
  }

  async quizSaveAnswer<T = unknown>(payload: Record<string, unknown>) {
    const raw = await this.request<{ data?: T }>('/api/quiz/answer', {
      method: 'POST',
      body: payload,
    });
    return raw.data as T;
  }

  async quizSubmit<T = unknown>(payload: Record<string, unknown>) {
    const raw = await this.request<{ data?: T }>('/api/quiz/submit', {
      method: 'POST',
      body: payload,
    });
    return raw.data as T;
  }

  async quizViolation<T = unknown>(payload: Record<string, unknown>) {
    const raw = await this.request<{ data?: T }>('/api/quiz/violation', {
      method: 'POST',
      body: payload,
    });
    return raw.data as T;
  }

  async uploadAssignment(file: PickedUploadFile, path: string) {
    const form = new FormData();
    form.append('bucket', 'assignments');
    form.append('path', path);
    form.append('upsert', 'false');
    form.append('fast_local', 'true');
    form.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType,
    } as unknown as Blob);

    const raw = await this.request<{ data?: { path?: string; fullPath?: string; provider?: string } }>(
      '/api/storage/upload',
      {
        method: 'POST',
        body: form,
      },
    );
    return raw.data || null;
  }
}

export const saveSelectedSchool = async (school: School | null) => {
  if (!school) {
    await AsyncStorage.removeItem(SESSION_SCHOOL_KEY);
    return;
  }
  await AsyncStorage.setItem(SESSION_SCHOOL_KEY, JSON.stringify(school));
};

export const loadSelectedSchool = async () => {
  const raw = await AsyncStorage.getItem(SESSION_SCHOOL_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as School;
    return parsed?.slug ? parsed : null;
  } catch {
    return null;
  }
};

export const getResponseHeader = getHeader;
