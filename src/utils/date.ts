export const isValidDate = (value: unknown): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime());

export const toDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return isValidDate(date) ? date : null;
};

export const formatDateTime = (value?: string | null) => {
  const date = toDate(value);
  if (!date) return '-';
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDate = (value?: string | null) => {
  const date = toDate(value);
  if (!date) return '-';
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const hoursUntil = (value?: string | null) => {
  const date = toDate(value);
  if (!date) return null;
  return (date.getTime() - Date.now()) / (60 * 60 * 1000);
};

export const isWithinDays = (value?: string | null, days = 7) => {
  const date = toDate(value);
  if (!date) return false;
  const diff = Date.now() - date.getTime();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
};
