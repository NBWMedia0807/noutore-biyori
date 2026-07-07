// src/routes/+layout.server.js
import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import {
  CATEGORY_DRAFT_FILTER,
  QUIZ_PUBLISHED_FILTER
} from '$lib/queries/quizVisibility.js';
import { getQuizStubCategories } from '$lib/server/quiz-stub.js';

// グローバルナビ（TOPページ等の水平タブ）に表示するカテゴリの並び順。
// 左から順に表示する。slug は Sanity のカテゴリ title でマッチングして解決するため、
// ここの slug はあくまで Sanity 取得に失敗した場合のフォールバック値。
const GLOBAL_NAV_CATEGORIES = [
  { title: 'マッチ棒クイズ', slug: 'matchstick-quiz' },
  { title: '難読漢字', slug: 'nandoku-kanji' },
  { title: '計算クイズ', slug: 'arithmetic-quiz' },
  { title: 'クロスワード', slug: 'crossword' },
  { title: '数式パズル', slug: 'formula-puzzle' }
];

// 公開クイズを1件以上持つ全カテゴリを取得する（空カテゴリはメニューに出さない）。
const CATEGORIES_QUERY = /* groq */ `
*[
  _type == "category"
  && defined(slug.current)
  ${CATEGORY_DRAFT_FILTER}
] | order(title asc) {
  title,
  "slug": slug.current,
  "quizCount": count(*[
    _type == "quiz"
    && defined(slug.current)
    && defined(category._ref)
    && category->slug.current == ^.slug
    ${QUIZ_PUBLISHED_FILTER}
  ])
}`;

const CACHE_TTL = 10 * 60 * 1000; // 10分

// サーバーインスタンス内で Sanity へのリクエストを10分に1回に抑えるキャッシュ
let _cache = null;

/**
 * グローバルナビ用に、指定順のカテゴリを Sanity 実データへ突き合わせて解決する。
 * title が一致するカテゴリがあればその実 slug を使い、無ければフォールバック slug を使う。
 */
const resolveGlobalNav = (allCategories) => {
  const byTitle = new Map(
    (Array.isArray(allCategories) ? allCategories : []).map((c) => [c.title, c])
  );
  return GLOBAL_NAV_CATEGORIES.map((item) => {
    const matched = byTitle.get(item.title);
    return {
      title: item.title,
      slug: matched?.slug ?? item.slug
    };
  });
};

export const load = async () => {
  // Sanity をスキップする環境（ローカル/テスト）ではスタブのカテゴリを使う
  if (shouldSkipSanityFetch()) {
    const categories = getQuizStubCategories();
    return {
      categories,
      globalNav: resolveGlobalNav(categories)
    };
  }

  const now = Date.now();
  if (!_cache || now - _cache.ts > CACHE_TTL) {
    const fetched = await client.fetch(CATEGORIES_QUERY).catch(() => []);
    const list = Array.isArray(fetched) ? fetched : [];
    // 公開クイズを持つカテゴリのみをメニューに掲載する
    const withQuizzes = list.filter((c) => c?.slug && (c.quizCount ?? 0) > 0);
    _cache = { data: withQuizzes, ts: now };
  }

  const categories = _cache.data;

  return {
    // ハンバーガーメニュー用: 公開クイズを持つ全カテゴリ（title昇順）
    categories,
    // グローバルナビ用: 指定順の5カテゴリ（実データで slug を解決）
    globalNav: resolveGlobalNav(categories)
  };
};
