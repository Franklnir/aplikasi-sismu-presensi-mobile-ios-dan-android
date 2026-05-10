export const compact = (value?: string | number | null, fallback = '-') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

export const initials = (value?: string | null) => {
  const words = String(value || 'User')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const picked = words.length >= 2 ? [words[0], words[1]] : [words[0] || 'U'];
  return picked.map((word) => word[0]?.toUpperCase()).join('');
};

export const safeFileName = (value = 'file') =>
  String(value || 'file')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 80) || 'file';
