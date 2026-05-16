import type { School } from '../types';
import {
  buildApiBaseUrl,
  isReservedSchool,
  isTrustedSchoolEndpoint,
  normalizeSlug,
  parseStaticSchools,
  trustedDirectoryUrl,
} from '../config/schools';

const normalizeSchool = (row: Partial<School>): School | null => {
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
  return isReservedSchool(school) || !isTrustedSchoolEndpoint(school) ? null : school;
};

const schoolMatches = (school: School, query: string) => {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  return school.name.toLowerCase().includes(q) || school.slug.toLowerCase().includes(q);
};

const endpointLooksHealthy = async (school: School) => {
  const baseUrl = buildApiBaseUrl(school);
  if (!baseUrl) return false;

  try {
    const response = await fetch(`${baseUrl}/api/health`, {
      headers: { Accept: 'application/json' },
    });
    return response.ok;
  } catch {
    return false;
  }
};

export const searchSchools = async (query: string): Promise<School[]> => {
  const staticSchools = parseStaticSchools();
  const q = query.trim();

  const directoryUrl = trustedDirectoryUrl();
  if (directoryUrl) {
    try {
      const url = new URL(directoryUrl);
      url.searchParams.set('search', q);
      const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
      const json = (await response.json()) as { data?: unknown } | unknown[];
      const rows = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
      const schools = rows
        .map((row) => normalizeSchool(row as Partial<School>))
        .filter((item): item is School => Boolean(item));
      if (schools.length > 0) return schools.slice(0, 12);
    } catch {
      // Static fallback keeps the login flow usable while the public directory endpoint is prepared.
    }
  }

  const filtered = staticSchools.filter((school) => schoolMatches(school, q)).slice(0, 12);
  return filtered;
};

export const resolveSchoolBySlug = async (query: string): Promise<School | null> => {
  const q = query.trim();
  const slug = normalizeSlug(q);
  if (!slug || slug.length < 2) return null;

  const school: School = {
    id: slug,
    name: query.trim() || slug,
    slug,
  };

  if (isReservedSchool(school) || !isTrustedSchoolEndpoint(school)) return null;
  if (await endpointLooksHealthy(school)) {
    return school;
  }

  return null;
};
