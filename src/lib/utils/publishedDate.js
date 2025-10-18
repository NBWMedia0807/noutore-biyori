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
