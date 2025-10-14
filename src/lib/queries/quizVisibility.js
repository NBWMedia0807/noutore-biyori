// src/lib/queries/quizVisibility.js
const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (value === null || value === undefined) return false;
  const normalized = value.toString().trim().toLowerCase();
  if (!normalized) return false;
  return ['1', 'true', 'yes', 'y', 'on'].includes(normalized);
};

let previewDraftsEnabled = false;

try {
  const module = await import('../sanity.server.js');
  if (typeof module?.previewDraftsEnabled === 'boolean') {
    previewDraftsEnabled = module.previewDraftsEnabled;
  }
} catch (error) {
  previewDraftsEnabled = toBoolean(process?.env?.SANITY_PREVIEW_DRAFTS);
}

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
codex/investigate-and-fix-article-display-issue-dgyft0
    if (source?.effectivePublishedAt) {
      candidates.push({ field: 'effectivePublishedAt', value: source.effectivePublishedAt });
    }

main
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

codex/investigate-and-fix-article-display-issue-dgyft0
export const QUIZ_EFFECTIVE_PUBLISHED_FIELD = 'coalesce(publishedAt, _createdAt)';

export const QUIZ_PUBLISHED_FIELD = 'coalesce(publishedAt, _createdAt)';
main

export const QUIZ_PUBLISHED_FILTER = shouldRestrictToPublishedContent
  ? `
  && !(_id in path("drafts.**"))
codex/investigate-and-fix-article-display-issue-dgyft0
  && ${QUIZ_EFFECTIVE_PUBLISHED_FIELD} <= now()`
  : '';

export const QUIZ_ORDER_BY_PUBLISHED = `${QUIZ_EFFECTIVE_PUBLISHED_FIELD} desc, _updatedAt desc, _id desc`;

  && defined(${QUIZ_PUBLISHED_FIELD})
  && ${QUIZ_PUBLISHED_FIELD} <= now()`
  : '';

export const QUIZ_ORDER_BY_PUBLISHED = `${QUIZ_PUBLISHED_FIELD} desc`;
main

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
codex/investigate-and-fix-article-display-issue-dgyft0
      console.info(
        `[quizVisibility] Excluding future-scheduled quiz ${context} (${new Date(timestamp).toISOString()})`
      );

main
      return acc;
    }

    const normalizedQuiz =
codex/investigate-and-fix-article-display-issue-dgyft0
      baseQuiz?.publishedAt === iso && baseQuiz?.effectivePublishedAt === iso
        ? baseQuiz
        : { ...baseQuiz, publishedAt: iso, effectivePublishedAt: iso };

      baseQuiz?.publishedAt === iso ? baseQuiz : { ...baseQuiz, publishedAt: iso };
main

    acc.push(normalizedQuiz);
    return acc;
  }, []);
};

export const ensureArray = (value) => (Array.isArray(value) ? value : []);
