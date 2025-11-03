// src/lib/rss/toRfc822.ts
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

const toDate = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
};

const pad2 = (value: number) => value.toString().padStart(2, '0');

export const toRfc822 = (input: unknown): string => {
  const base = toDate(input);
  if (!base) return '';
  const adjusted = new Date(base.getTime() + JST_OFFSET_MS);
  const dayName = DAYS[adjusted.getUTCDay()];
  const day = pad2(adjusted.getUTCDate());
  const month = MONTHS[adjusted.getUTCMonth()];
  const year = adjusted.getUTCFullYear();
  const hour = pad2(adjusted.getUTCHours());
  const minute = pad2(adjusted.getUTCMinutes());
  const second = pad2(adjusted.getUTCSeconds());
  return `${dayName}, ${day} ${month} ${year} ${hour}:${minute}:${second} +0900`;
};
