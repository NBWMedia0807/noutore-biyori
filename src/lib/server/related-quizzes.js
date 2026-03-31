import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { QUIZ_PREVIEW_PROJECTION } from '$lib/queries/quizPreview.js';
import { resolvePublishedDate } from '$lib/utils/publishedDate.js';
import {
  QUIZ_ORDER_BY_PUBLISHED,
  QUIZ_PUBLISHED_FILTER,
  filterVisibleQuizzes
} from '$lib/queries/quizVisibility.js';

const RELATED_QUERY = /* groq */ `{
  "matchstick": *[
    _type == "quiz"
    && defined(slug.current)
    && slug.current != $slug
    ${QUIZ_PUBLISHED_FILTER}
    && isRepublished != true
    && defined(category._ref)
    && category->slug.current == "matchstick-quiz"
  ] | order(${QUIZ_ORDER_BY_PUBLISHED})[0...6]{
    ${QUIZ_PREVIEW_PROJECTION}
  },
  "kanji": *[
    _type == "quiz"
    && defined(slug.current)
    && slug.current != $slug
    ${QUIZ_PUBLISHED_FILTER}
    && isRepublished != true
    && defined(category._ref)
    && category->slug.current in ["kanji-quiz", "nandoku-kanji"]
  ] | order(${QUIZ_ORDER_BY_PUBLISHED})[0...6]{
    ${QUIZ_PREVIEW_PROJECTION}
  },
  "number": *[
    _type == "quiz"
    && defined(slug.current)
    && slug.current != $slug
    ${QUIZ_PUBLISHED_FILTER}
    && isRepublished != true
    && defined(category._ref)
    && category->slug.current == "number-quiz"
  ] | order(${QUIZ_ORDER_BY_PUBLISHED})[0...6]{
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
    popularityScore: toMetric(quiz?.popularityScore),
    difficulty: quiz?.difficulty ?? null,
    readingTime: quiz?.readingTime ?? null,
    textLength: toMetric(quiz?.textLength)
  };
};

export async function fetchRelatedQuizzes({ slug, categorySlug }) {
  if (shouldSkipSanityFetch()) return [];

  try {
    const payload = await client.fetch(RELATED_QUERY, { slug });

    const matchstick = filterVisibleQuizzes(payload?.matchstick).map(toPreview).filter(Boolean);
    const kanji = filterVisibleQuizzes(payload?.kanji).map(toPreview).filter(Boolean);
    const number = filterVisibleQuizzes(payload?.number).map(toPreview).filter(Boolean);

    const seen = new Set();
    const result = [];

    // 各カテゴリから最大4件ずつ取得
    const appendItems = (source, perCategory) => {
      let added = 0;
      for (const item of source) {
        if (!item?.slug || seen.has(item.slug) || added >= perCategory) continue;
        seen.add(item.slug);
        result.push(item);
        added++;
      }
    };

    appendItems(matchstick, 4);
    appendItems(kanji, 4);
    appendItems(number, 4);

    // 12件に満たない場合は各カテゴリから追加補充
    const TOTAL = 12;
    if (result.length < TOTAL) {
      const all = [...matchstick, ...kanji, ...number];
      for (const item of all) {
        if (result.length >= TOTAL) break;
        if (!item?.slug || seen.has(item.slug)) continue;
        seen.add(item.slug);
        result.push(item);
      }
    }

    return result;
  } catch (error) {
    console.error('[related-quizzes] failed to fetch related quizzes', error);
    return [];
  }
}
