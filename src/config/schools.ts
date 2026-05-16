import type { School } from '../types';

const reservedSlugs = new Set(['super', 'super-admin', 'admin', 'admin26', 'app', 'api', 'www']);
const DEFAULT_ROOT_DOMAIN = 'sismu.biz.id';
const DEFAULT_API_BASE_URL = `https://{slug}.${DEFAULT_ROOT_DOMAIN}`;
const DEFAULT_SCHOOL_DIRECTORY_URL = `https://admin26.${DEFAULT_ROOT_DOMAIN}/api/mobile/schools`;

const env = (key: string) => String(process.env[key] || '').trim();

export const appConfig = {
  apiBaseUrl: env('EXPO_PUBLIC_API_BASE_URL') || DEFAULT_API_BASE_URL,
  rootDomain: env('EXPO_PUBLIC_ROOT_DOMAIN') || DEFAULT_ROOT_DOMAIN,
  apiScheme: env('EXPO_PUBLIC_API_SCHEME') || 'https',
  schoolDirectoryUrl: env('EXPO_PUBLIC_SCHOOL_DIRECTORY_URL') || DEFAULT_SCHOOL_DIRECTORY_URL,
  tenantHeaderEnabled: env('EXPO_PUBLIC_TENANT_HEADER_ENABLED').toLowerCase() === 'true',
  tenantHeaderName: env('EXPO_PUBLIC_TENANT_HEADER_NAME') || 'X-Tenant',
  allowInsecureApi: env('EXPO_PUBLIC_ALLOW_INSECURE_API').toLowerCase() === 'true',
  allowedApiHosts: env('EXPO_PUBLIC_ALLOWED_API_HOSTS')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean),
};

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const hostMatches = (host: string, allowedHost: string) =>
  host === allowedHost || host.endsWith(`.${allowedHost}`);

const isLocalHost = (host: string) =>
  host === 'localhost' ||
  host === '127.0.0.1' ||
  host === '10.0.2.2' ||
  host.endsWith('.localhost') ||
  host.endsWith('.127.0.0.1.nip.io');

const parseConfiguredHostRule = (value: string, fallbackScheme = appConfig.apiScheme) => {
  const raw = value.trim();
  if (!raw) return null;

  try {
    const slugToken = 'edusmart-school';
    const hasSlugTemplate = /\{slug\}/i.test(raw);
    const tokenized = raw.replace(/\{slug\}/gi, slugToken);
    const withScheme = /^https?:\/\//i.test(tokenized) ? tokenized : `${fallbackScheme}://${tokenized}`;
    const host = new URL(withScheme).hostname.toLowerCase();
    if (!host) return null;

    const labels = host.split('.');
    const slugIndex = labels.indexOf(slugToken);
    const suffix = hasSlugTemplate && slugIndex >= 0 && labels.length > slugIndex + 1
      ? `.${labels.slice(slugIndex + 1).join('.')}`
      : '';

    return { host, suffix };
  } catch {
    return null;
  }
};

const configuredHostRules = () => [
  parseConfiguredHostRule(appConfig.apiBaseUrl),
  parseConfiguredHostRule(appConfig.schoolDirectoryUrl),
].filter((item): item is { host: string; suffix: string } => Boolean(item));

const matchesConfiguredHostRule = (host: string, rule: { host: string; suffix: string }) =>
  host === rule.host || Boolean(rule.suffix && host.endsWith(rule.suffix) && host.length > rule.suffix.length);

const isAllowedApiHost = (host: string) => {
  const normalizedHost = host.toLowerCase().trim();
  if (!normalizedHost) return false;
  if (isLocalHost(normalizedHost)) return true;

  const root = appConfig.rootDomain.toLowerCase().trim();
  if (root && hostMatches(normalizedHost, root)) return true;
  if (configuredHostRules().some((rule) => matchesConfiguredHostRule(normalizedHost, rule))) return true;

  return appConfig.allowedApiHosts.some((allowedHost) => hostMatches(normalizedHost, allowedHost));
};

const normalizeTrustedUrl = (value: string, fallbackScheme = appConfig.apiScheme) => {
  const raw = value.trim();
  if (!raw) return '';

  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `${fallbackScheme}://${raw}`;
    const url = new URL(withScheme);
    const host = url.hostname.toLowerCase();
    const scheme = url.protocol.replace(':', '').toLowerCase();

    if (!['http', 'https'].includes(scheme)) return '';
    if (scheme !== 'https' && !(appConfig.allowInsecureApi || isLocalHost(host))) return '';
    if (!isAllowedApiHost(host)) return '';

    return stripTrailingSlash(url.toString());
  } catch {
    return '';
  }
};

export const normalizeSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);

export const isReservedSchool = (school: Pick<School, 'slug'>) =>
  reservedSlugs.has(normalizeSlug(school.slug));

export const parseStaticSchools = (): School[] => {
  const raw = env('EXPO_PUBLIC_SCHOOLS_JSON');
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item): School | null => {
        const row = item as Partial<School>;
        const slug = normalizeSlug(String(row.slug || ''));
        const name = String(row.name || row.slug || '').trim();
        if (!slug || !name) return null;
        const school: School = {
          id: row.id ? String(row.id) : slug,
          name,
          slug,
          logoUrl: row.logoUrl ? String(row.logoUrl) : undefined,
          apiBaseUrl: row.apiBaseUrl ? normalizeTrustedUrl(String(row.apiBaseUrl)) || undefined : undefined,
          host: row.host ? normalizeTrustedUrl(String(row.host)).replace(/^https?:\/\//i, '') || undefined : undefined,
          status: row.status ? String(row.status) : undefined,
        };
        return school;
      })
      .filter((item): item is School => Boolean(item && !isReservedSchool(item) && isTrustedSchoolEndpoint(item)));
  } catch {
    return [];
  }
};

export const buildApiBaseUrl = (school: School): string => {
  if (school.apiBaseUrl) return normalizeTrustedUrl(school.apiBaseUrl);
  if (school.host) {
    return normalizeTrustedUrl(school.host);
  }
  if (appConfig.apiBaseUrl.includes('{slug}')) {
    return normalizeTrustedUrl(appConfig.apiBaseUrl.replace('{slug}', school.slug));
  }
  if (appConfig.rootDomain) {
    return normalizeTrustedUrl(`${appConfig.apiScheme}://${school.slug}.${appConfig.rootDomain}`);
  }
  return normalizeTrustedUrl(appConfig.apiBaseUrl);
};

export const isTrustedSchoolEndpoint = (school: School) => buildApiBaseUrl(school) !== '';

export const trustedDirectoryUrl = () => normalizeTrustedUrl(appConfig.schoolDirectoryUrl);
