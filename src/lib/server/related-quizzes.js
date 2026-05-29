import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { QUIZ_PREVIEW_PROJECTION } from '$lib/queries/quizPreview.js';
import { resolvePublishedDate } from '$lib/utils/publishedDate.js';
import {
  QUIZ_ORDER_BY_PUBLISHED,
  QUIZ_PUBLISHED_FILTER,
  filterVisibleQuizzes,
} from '$lib/queries/quizVisibility.js';

// 関連記事は特定カテゴリに限定せず、全カテゴリの公開済み記事を新着順に取得する。
// 取得後、JS側でカテゴリごとにグルーピングし「直近更新があるカテゴリ」のみを対象に
// ラウンドロビンで詰めることで、いろいろなカテゴリをバランス良く掲載する。
const RELATED_QUERY = /* groq */ `*[
  _type == "quiz"
  && defined(slug.current)
  && slug.current != $slug
  ${QUIZ_PUBLISHED_FILTER}
  && isRepublished != true
  && defined(category._ref)
  && defined(category->slug.current)
] | order(${QUIZ_ORDER_BY_PUBLISHED})[0...150]{
  ${QUIZ_PREVIEW_PROJECTION}
}`;

// このカテゴリの最新記事がこの日数より古い場合は「直近更新なし」とみなし掲載しない。
const RECENT_CATEGORY_WINDOW_DAYS = 30;

// 1カテゴリあたり最終的に掲載する最大件数（特定カテゴリ偏重を防ぐ）。
const MAX_PER_CATEGORY = 4;

// 関連記事として返す総件数。
const TOTAL_RELATED = 12;

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
    textLength: toMetric(quiz?.textLength),
  };
};

const toTimestamp = (value) => {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
};

export async function fetchRelatedQuizzes({ slug, categorySlug }) {
  if (shouldSkipSanityFetch()) return [];

  try {
    const payload = await client.fetch(RELATED_QUERY, { slug });

    // 公開済みのみ＆新着順（クエリで order 済み）の記事一覧
    const quizzes = filterVisibleQuizzes(payload).map(toPreview).filter(Boolean);

    // カテゴリごとにグルーピング（各グループ内は新着順を維持）
    const groups = new Map();
    for (const quiz of quizzes) {
      const cslug = quiz.category?.slug;
      if (!cslug) continue;
      let group = groups.get(cslug);
      if (!group) {
        group = { slug: cslug, latest: 0, items: [] };
        groups.set(cslug, group);
      }
      group.items.push(quiz);
      const ts = toTimestamp(quiz.publishedAt);
      if (ts > group.latest) group.latest = ts;
    }

    // 「直近更新があるカテゴリ」だけに絞り込む（更新が止まったカテゴリは掲載しない）
    const now = Date.now();
    const recentThreshold = now - RECENT_CATEGORY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    let activeGroups = [...groups.values()].filter((group) => group.latest >= recentThreshold);

    // 全カテゴリが閾値外の場合でも関連記事が空にならないようフォールバック
    if (activeGroups.length === 0) {
      activeGroups = [...groups.values()];
    }

    // 更新が新しいカテゴリ順に並べ、現在の記事と同じカテゴリは先頭に寄せる
    activeGroups.sort((a, b) => b.latest - a.latest);
    if (categorySlug) {
      const idx = activeGroups.findIndex((group) => group.slug === categorySlug);
      if (idx > 0) {
        const [current] = activeGroups.splice(idx, 1);
        activeGroups.unshift(current);
      }
    }

    // 各カテゴリから1件ずつ順番に取り出すラウンドロビンで、
    // 多様なカテゴリをバランス良く TOTAL_RELATED 件まで詰める
    const seen = new Set();
    const result = [];
    for (let round = 0; round < MAX_PER_CATEGORY && result.length < TOTAL_RELATED; round++) {
      for (const group of activeGroups) {
        if (result.length >= TOTAL_RELATED) break;
        const item = group.items[round];
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
