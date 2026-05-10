import type { School } from '../types';

const reservedSlugs = new Set(['super', 'super-admin', 'admin', 'admin26', 'app', 'api', 'www']);

const env = (key: string) => String(process.env[key] || '').trim();

export const appConfig = {
  apiBaseUrl: env('EXPO_PUBLIC_API_BASE_URL'),
  rootDomain: env('EXPO_PUBLIC_ROOT_DOMAIN'),
  apiScheme: env('EXPO_PUBLIC_API_SCHEME') || 'https',
  schoolDirectoryUrl: env('EXPO_PUBLIC_SCHOOL_DIRECTORY_URL'),
  tenantHeaderEnabled: env('EXPO_PUBLIC_TENANT_HEADER_ENABLED').toLowerCase() === 'true',
  tenantHeaderName: env('EXPO_PUBLIC_TENANT_HEADER_NAME') || 'X-Tenant',
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
          apiBaseUrl: row.apiBaseUrl ? String(row.apiBaseUrl) : undefined,
          host: row.host ? String(row.host) : undefined,
          status: row.status ? String(row.status) : undefined,
        };
        return school;
      })
      .filter((item): item is School => Boolean(item && !isReservedSchool(item)));
  } catch {
    return [];
  }
};

export const buildApiBaseUrl = (school: School): string => {
  if (school.apiBaseUrl) return school.apiBaseUrl.replace(/\/+$/, '');
  if (school.host) {
    const hasScheme = /^https?:\/\//i.test(school.host);
    return `${hasScheme ? '' : `${appConfig.apiScheme}://`}${school.host}`.replace(/\/+$/, '');
  }
  if (appConfig.apiBaseUrl.includes('{slug}')) {
    return appConfig.apiBaseUrl.replace('{slug}', school.slug).replace(/\/+$/, '');
  }
  if (appConfig.rootDomain) {
    return `${appConfig.apiScheme}://${school.slug}.${appConfig.rootDomain}`.replace(/\/+$/, '');
  }
  return appConfig.apiBaseUrl.replace(/\/+$/, '');
};
