// src/lib/queries/quizVisibility.js
import { previewDraftsEnabled } from '$lib/sanity.server.js';

export const shouldRestrictToPublishedContent = !previewDraftsEnabled;

const PUBLISHED_AT_FALLBACK = 'coalesce(publishedAt, _createdAt)';

export const QUIZ_PUBLISHED_FILTER = shouldRestrictToPublishedContent
  ? `
  && !(_id in path("drafts.**"))
  && ${PUBLISHED_AT_FALLBACK} <= now()`
  : '';

export const QUIZ_ORDER_BY_PUBLISHED = `${PUBLISHED_AT_FALLBACK} desc`;

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

export const isFutureScheduled = (value) => {
  if (!value) return false;
  try {
    return new Date(value).getTime() > Date.now();
  } catch (error) {
    console.warn('[quizVisibility] Invalid publishedAt value detected', value, error);
    return false;
  }
};

const resolvePublishedAt = (quiz) => quiz?.publishedAt ?? quiz?._createdAt ?? null;

export const filterVisibleQuizzes = (items) => {
  if (!Array.isArray(items)) return [];

  return items
    .map((quiz) => {
      const slug = toSlugString(quiz);
      const publishedAt = resolvePublishedAt(quiz);

      if (!slug && !publishedAt) {
        return quiz;
      }

      const needsSlugNormalization = slug && typeof quiz.slug !== 'string';
      const needsPublishedFallback = !quiz?.publishedAt && publishedAt;

      if (!needsSlugNormalization && !needsPublishedFallback) {
        return quiz;
      }

      return {
        ...quiz,
        ...(needsSlugNormalization ? { slug } : {}),
        ...(needsPublishedFallback ? { publishedAt } : {})
      };
    })
    .filter((quiz) => {
      const slug = toSlugString(quiz);
      if (!slug) return false;

      const publishedAt = resolvePublishedAt(quiz);

      if (!shouldRestrictToPublishedContent) {
        return Boolean(publishedAt);
      }

      if (!publishedAt) return false;

      if (Number.isNaN(Date.parse(publishedAt))) {
        console.warn('[quizVisibility] Invalid publishedAt value detected', publishedAt, quiz?._id);
        return false;
      }

      return !isFutureScheduled(publishedAt);
    });
};

export const ensureArray = (value) => (Array.isArray(value) ? value : []);
