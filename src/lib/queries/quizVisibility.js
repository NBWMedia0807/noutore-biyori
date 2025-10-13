// src/lib/queries/quizVisibility.js
import { previewDraftsEnabled } from '$lib/sanity.server.js';

export const shouldRestrictToPublishedContent = !previewDraftsEnabled;

const logInvalidDate = (field, value, context) => {
  if (!value) return;
  const contextInfo = context ? ` (${context})` : '';
  console.warn(`[quizVisibility] Invalid ${field} value detected${contextInfo}`, value);
};

const resolvePublishInfo = (source, context) => {
  if (!source) {
    return { iso: null, timestamp: Number.NaN };
  }

  const candidates = [];

  if (typeof source === 'string') {
    candidates.push({ field: 'value', value: source });
  } else if (typeof source === 'object') {
    if (source?.publishedAt) {
      candidates.push({ field: 'publishedAt', value: source.publishedAt });
    }
    if (source?._createdAt) {
      candidates.push({ field: '_createdAt', value: source._createdAt });
    }
  }

  for (const candidate of candidates) {
    const date = new Date(candidate.value);
    if (!Number.isNaN(date.getTime())) {
      return { iso: date.toISOString(), timestamp: date.getTime() };
    }
    logInvalidDate(candidate.field, candidate.value, context);
  }

  return { iso: null, timestamp: Number.NaN };
};

export const resolvePublishedDate = (source, context) => resolvePublishInfo(source, context).iso;

export const QUIZ_PUBLISHED_FIELD = 'coalesce(publishedAt, _createdAt)';

export const QUIZ_PUBLISHED_FILTER = shouldRestrictToPublishedContent
  ? `
  && !(_id in path("drafts.**"))
  && defined(${QUIZ_PUBLISHED_FIELD})
  && ${QUIZ_PUBLISHED_FIELD} <= now()`
  : '';

export const QUIZ_ORDER_BY_PUBLISHED = `${QUIZ_PUBLISHED_FIELD} desc`;

export const CATEGORY_DRAFT_FILTER = shouldRestrictToPublishedContent
  ? `
  && !(_id in path("drafts.**"))`
  : '';

const toSlugString = (quiz) => {
  if (!quiz) return '';
  if (typeof quiz.slug === 'string') return quiz.slug.trim();
  const slugCandidate = quiz.slug?.current ?? quiz.slug?._ref ?? '';
  return typeof slugCandidate === 'string' ? slugCandidate.trim() : '';
};

export const isFutureScheduled = (value, context) => {
  const info = typeof value === 'object' ? resolvePublishInfo(value, context) : resolvePublishInfo({ publishedAt: value }, context);
  if (Number.isNaN(info.timestamp)) {
    return false;
  }
  return info.timestamp > Date.now();
};

export const filterVisibleQuizzes = (items) => {
  if (!Array.isArray(items)) return [];

  const now = Date.now();

  return items.reduce((acc, originalQuiz) => {
    const slug = toSlugString(originalQuiz);
    if (!slug) return acc;

    const baseQuiz =
      slug && typeof originalQuiz.slug !== 'string' ? { ...originalQuiz, slug } : originalQuiz;

    const context = originalQuiz?._id ?? slug;
    const { iso, timestamp } = resolvePublishInfo(baseQuiz, context);

    if (!iso || Number.isNaN(timestamp)) {
      return acc;
    }

    if (shouldRestrictToPublishedContent && timestamp > now) {
      return acc;
    }

    const normalizedQuiz =
      baseQuiz?.publishedAt === iso ? baseQuiz : { ...baseQuiz, publishedAt: iso };

    acc.push(normalizedQuiz);
    return acc;
  }, []);
};

export const ensureArray = (value) => (Array.isArray(value) ? value : []);
