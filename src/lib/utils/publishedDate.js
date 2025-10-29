// src/lib/utils/publishedDate.js
// 公開日時（publishedAt）関連の共通ヘルパー群。
// Sanity ドキュメントでもスタブデータでも同じ判定ロジックを使えるように、
// サーバー／クライアントのどちらからでも参照可能な純粋関数で構成する。

const toValidDate = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const fromNumber = new Date(value);
    return Number.isNaN(fromNumber.getTime()) ? null : fromNumber;
  }

  if (typeof value === 'string' && value.trim().length === 0) {
    return null;
  }

  const candidate = new Date(value);
  return Number.isNaN(candidate.getTime()) ? null : candidate;
};

const logInvalidDate = (field, value, context) => {
  if (typeof console === 'undefined' || !console?.warn) return;
  const contextInfo = context ? ` (${context})` : '';
  console.warn(`[publishedDate] Invalid ${field} value detected${contextInfo}`, value);
};

const pad2 = (value) => String(value).padStart(2, '0');

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

const manualJstFormat = (date, includeTime) => {
  const adjusted = new Date(date.getTime() + JST_OFFSET_MS);
  const year = adjusted.getUTCFullYear();
  const month = pad2(adjusted.getUTCMonth() + 1);
  const day = pad2(adjusted.getUTCDate());

  if (!includeTime) {
    return `${year}/${month}/${day}`;
  }

  const hour = pad2(adjusted.getUTCHours());
  const minute = pad2(adjusted.getUTCMinutes());
  return `${year}/${month}/${day} ${hour}:${minute}`;
};

const createBaseFormatOptions = (includeTime) => ({
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  ...(includeTime
    ? {
        hour: '2-digit',
        minute: '2-digit'
      }
    : {})
});

const formatDateWithLocale = (date, { locale, timeZone, includeTime }) => {
  const baseOptions = createBaseFormatOptions(includeTime);
  if (timeZone) {
    baseOptions.timeZone = timeZone;
  }

  try {
    const formatter = new Intl.DateTimeFormat(locale, baseOptions);
    const resolvedTimeZone = formatter.resolvedOptions().timeZone;
    if (
      !timeZone ||
      !resolvedTimeZone ||
      resolvedTimeZone.toLowerCase() === timeZone.toLowerCase()
    ) {
      return formatter.format(date);
    }
  } catch (error) {
    // サポートされないロケール／タイムゾーンの場合はフォールバック処理へ進む
  }

  if (timeZone === 'Asia/Tokyo') {
    return manualJstFormat(date, includeTime);
  }

  try {
    const fallbackFormatter = new Intl.DateTimeFormat(locale, createBaseFormatOptions(includeTime));
    return fallbackFormatter.format(date);
  } catch (error) {
    // Intl が完全に利用できない環境向けの最終フォールバック
    const year = date.getUTCFullYear();
    const month = pad2(date.getUTCMonth() + 1);
    const day = pad2(date.getUTCDate());
    if (!includeTime) {
      return `${year}/${month}/${day}`;
    }
    const hour = pad2(date.getUTCHours());
    const minute = pad2(date.getUTCMinutes());
    return `${year}/${month}/${day} ${hour}:${minute}`;
  }
};

const appendCandidate = (candidates, field, value) => {
  if (value === null || value === undefined) return;
  candidates.push({ field, value });
};

export const resolvePublishInfo = (source, context) => {
  if (source === null || source === undefined) {
    return { iso: null, timestamp: Number.NaN };
  }

  const candidates = [];

  if (typeof source === 'string' || source instanceof Date || typeof source === 'number') {
    appendCandidate(candidates, 'value', source);
  } else if (typeof source === 'object') {
    appendCandidate(candidates, 'publishedAt', source.publishedAt);
    appendCandidate(candidates, '_createdAt', source._createdAt);
  }

  for (const candidate of candidates) {
    const date = toValidDate(candidate.value);
    if (date) {
      return { iso: date.toISOString(), timestamp: date.getTime() };
    }
    logInvalidDate(candidate.field, candidate.value, context);
  }

  return { iso: null, timestamp: Number.NaN };
};

export const resolvePublishedDate = (source, context) => {
  const { iso } = resolvePublishInfo(source, context);
  return iso;
};

export const resolvePublishedTimestamp = (source, context) => {
  const { timestamp } = resolvePublishInfo(source, context);
  return Number.isFinite(timestamp) ? timestamp : Number.NaN;
};

export const ensurePublishedAt = (doc, context) => {
  if (doc === null || doc === undefined || typeof doc !== 'object') {
    return doc;
  }

  const { iso } = resolvePublishInfo(doc, context);
  if (!iso) return doc;
  if (doc.publishedAt === iso) return doc;
  return { ...doc, publishedAt: iso };
};

export const formatPublishedDateLabel = (
  value,
  { locale = 'ja-JP', timeZone = 'Asia/Tokyo', includeTime = false, context } = {}
) => {
  const source =
    value && typeof value === 'object' && !(value instanceof Date)
      ? value
      : { publishedAt: value };

  const { iso } = resolvePublishInfo(source, context);
  if (!iso) return '';

  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      logInvalidDate('publishedAt', value, context);
      return '';
    }

    return formatDateWithLocale(date, { locale, timeZone, includeTime });
  } catch (error) {
    logInvalidDate('publishedAt', value, context);
    return '';
  }
};

export const isFutureScheduled = (value, context) => {
  const info =
    value && typeof value === 'object' && !(value instanceof Date)
      ? resolvePublishInfo(value, context)
      : resolvePublishInfo({ publishedAt: value }, context);

  if (!Number.isFinite(info.timestamp)) {
    return false;
  }

  return info.timestamp > Date.now();
};
