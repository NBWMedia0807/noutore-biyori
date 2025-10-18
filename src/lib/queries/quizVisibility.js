// src/lib/queries/quizVisibility.js
import { previewDraftsEnabled } from '$lib/sanity.server.js';
import {
  ensurePublishedAt,
  isFutureScheduled,
  resolvePublishInfo,
  resolvePublishedDate
} from '$lib/utils/publishedDate.js';

export { resolvePublishedDate, isFutureScheduled } from '$lib/utils/publishedDate.js';

export const shouldRestrictToPublishedContent = !previewDraftsEnabled;

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

    acc.push(ensurePublishedAt(baseQuiz, context));
    return acc;
  }, []);
};

export const ensureArray = (value) => (Array.isArray(value) ? value : []);
