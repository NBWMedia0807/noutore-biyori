import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { QUIZ_PREVIEW_PROJECTION } from '$lib/queries/quizPreview.js';
import { resolvePublishedDate } from '$lib/utils/publishedDate.js';
import {
  QUIZ_ORDER_BY_PUBLISHED,
  QUIZ_PUBLISHED_FILTER,
  filterVisibleQuizzes
} from '$lib/queries/quizVisibility.js';

const RELATED_QUERY = /* groq */ `{
  "sameCategory": *[
    _type == "quiz"
    && defined(slug.current)
    && slug.current != $slug
    ${QUIZ_PUBLISHED_FILTER}
    && defined(category._ref)
    && category->slug.current == $categorySlug
  ] | order(${QUIZ_ORDER_BY_PUBLISHED})[0...12]{
    ${QUIZ_PREVIEW_PROJECTION}
  },
  "latest": *[
    _type == "quiz"
    && defined(slug.current)
    && slug.current != $slug
    ${QUIZ_PUBLISHED_FILTER}
  ] | order(${QUIZ_ORDER_BY_PUBLISHED})[0...24]{
    ${QUIZ_PREVIEW_PROJECTION}
  }
}`;

const pickImage = (quiz) =>
  quiz?.problemImage?.asset?.url
    ? quiz.problemImage
    : quiz?.mainImage?.asset?.url
      ? quiz.mainImage
      : quiz?.answerImage?.asset?.url
        ? quiz.answerImage
        : null;

const toMetric = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const toPreview = (quiz) => {
  if (!quiz?.slug) return null;
  const image = pickImage(quiz);
  const context = quiz?._id ?? quiz.slug;
  const publishedAt = resolvePublishedDate(quiz, context);
  return {
    id: quiz._id ?? quiz.slug,
    title: quiz.title ?? '脳トレ問題',
    slug: quiz.slug,
    category: quiz.category ?? null,
    image,
    problemImage: quiz.problemImage ?? null,
    mainImage: quiz.mainImage ?? quiz.problemImage ?? null,
    answerImage: quiz.answerImage ?? null,
    thumbnailUrl: quiz.thumbnailUrl ?? null,
    publishedAt: publishedAt ?? null,
    _createdAt: quiz?._createdAt ?? null,
    viewCount: toMetric(quiz?.viewCount),
    likeCount: toMetric(quiz?.likeCount),
    popularityScore: toMetric(quiz?.popularityScore)
  };
};

export async function fetchRelatedQuizzes({ slug, categorySlug }) {
  if (shouldSkipSanityFetch()) return [];

  try {
    const payload = await client.fetch(RELATED_QUERY, {
      slug,
      categorySlug: categorySlug ?? null
    });

    const sameCategory = filterVisibleQuizzes(payload?.sameCategory).map(toPreview).filter(Boolean);
    const latest = filterVisibleQuizzes(payload?.latest).map(toPreview).filter(Boolean);

    const seen = new Set();
    const limit = 6;
    const result = [];

    const appendItems = (source) => {
      for (const item of source) {
        if (!item?.slug || seen.has(item.slug) || result.length >= limit) continue;
        seen.add(item.slug);
        result.push(item);
        if (result.length >= limit) break;
      }
    };

    appendItems(sameCategory);
    appendItems(latest);

    return result;
  } catch (error) {
    console.error('[related-quizzes] failed to fetch related quizzes', error);
    return [];
  }
}
