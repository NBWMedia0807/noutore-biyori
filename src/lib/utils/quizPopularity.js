import { filterVisibleQuizzes } from '$lib/queries/quizVisibility.js';

const RECENCY_WINDOW_DAYS = 120;

const toPositiveNumber = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }
  return 0;
};

const resolvePublishedTimestamp = (quiz) => {
  const source = quiz?.publishedAt ?? quiz?._createdAt ?? null;
  if (!source) return Number.NaN;
  const timestamp = new Date(source).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NaN;
};

const computeRecencyBoost = (timestamp) => {
  if (!Number.isFinite(timestamp)) return 0;
  const now = Date.now();
  const diffMs = now - timestamp;
  if (!Number.isFinite(diffMs)) return 0;
  const days = diffMs / (1000 * 60 * 60 * 24);
  if (days <= 0) return RECENCY_WINDOW_DAYS;
  if (days >= RECENCY_WINDOW_DAYS) return 0;
  return RECENCY_WINDOW_DAYS - days;
};

export const computePopularityScore = (quiz, fallbackRank = 0) => {
  const baseScore = toPositiveNumber(quiz?.popularityScore ?? quiz?.popularity?.score);
  const views = toPositiveNumber(
    quiz?.viewCount ?? quiz?.popularity?.views ?? quiz?.popularity?.pageViews
  );
  const likes = toPositiveNumber(quiz?.likeCount ?? quiz?.popularity?.likes);
  const timestamp = resolvePublishedTimestamp(quiz);
  const recencyBoost = computeRecencyBoost(timestamp);
  const rankBonus = Math.max(0, 48 - fallbackRank);

  return baseScore * 100 + views * 6 + likes * 40 + recencyBoost * 5 + rankBonus;
};

const normalizeQuizList = (list) => (Array.isArray(list) ? list : []);

const appendUniqueQuizzes = (target, source, seen) => {
  for (const quiz of normalizeQuizList(source)) {
    const slug = typeof quiz?.slug === 'string' ? quiz.slug : quiz?.slug?.current;
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    target.push(quiz);
  }
};

const sortByPopularityScore = (items) => {
  return items
    .map(({ quiz, score }) => ({ quiz, score }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aTime = resolvePublishedTimestamp(a.quiz);
      const bTime = resolvePublishedTimestamp(b.quiz);
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
    });
};

export const rankQuizzesByPopularity = ({ primary = [], fallback = [], limit = 6 } = {}) => {
  const normalizedPrimary = filterVisibleQuizzes(primary);
  const normalizedFallback = filterVisibleQuizzes(fallback);
  const merged = [];
  const seen = new Set();

  appendUniqueQuizzes(merged, normalizedPrimary, seen);
  appendUniqueQuizzes(merged, normalizedFallback, seen);

  const scored = merged.map((quiz, index) => ({
    quiz,
    score: computePopularityScore(quiz, index)
  }));

  const sorted = sortByPopularityScore(scored);
  const limited = typeof limit === 'number' && limit > 0 ? sorted.slice(0, limit) : sorted;
  return limited.map((entry) => entry.quiz);
};

export const mergeWithFallback = (primary = [], fallback = []) => {
  const merged = [];
  const seen = new Set();
  appendUniqueQuizzes(merged, primary, seen);
  appendUniqueQuizzes(merged, fallback, seen);
  return merged;
};
