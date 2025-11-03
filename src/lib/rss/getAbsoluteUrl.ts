// src/lib/rss/getAbsoluteUrl.ts
import { env } from '$env/dynamic/public';

const DEFAULT_BASE = 'https://noutorebiyori.com';
const resolveBase = () => {
  const value = env?.PUBLIC_SITE_URL;
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return DEFAULT_BASE;
};

const SITE_BASE = resolveBase().replace(/\/+$/, '');

const isAbsoluteUrl = (value: string) => /^(https?:)?\/\//i.test(value);
const isMailOrTel = (value: string) => /^(mailto:|tel:)/i.test(value);

const normalizePath = (path: string) => {
  if (!path) return '';
  if (path === '/') return '';
  return path.startsWith('/') ? path : `/${path}`;
};

export const getAbsoluteUrl = (input: string): string => {
  if (typeof input !== 'string') return SITE_BASE;
  const trimmed = input.trim();
  if (!trimmed) return SITE_BASE;
  if (isAbsoluteUrl(trimmed) || isMailOrTel(trimmed)) return trimmed;
  if (trimmed.startsWith('#')) {
    return `${SITE_BASE}/${trimmed.replace(/^#+/, '') ? trimmed : ''}`.replace(/\/$/, '');
  }
  return `${SITE_BASE}${normalizePath(trimmed)}`;
};
