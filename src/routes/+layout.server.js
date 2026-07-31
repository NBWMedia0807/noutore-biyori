// src/routes/+layout.server.js
import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import {
  CATEGORY_DRAFT_FILTER,
  QUIZ_PUBLISHED_FILTER
} from '$lib/queries/quizVisibility.js';
import { getQuizStubCategories } from '$lib/server/quiz-stub.js';

// グローバルナビ（TOPページ等の水平タブ）に表示するカテゴリの並び順（左→右）。
// slug は Sanity のカテゴリ title でマッチングして実 slug に解決する。
// pinnedSlug:true の項目は title 照合せず必ずこの slug を使う
// （難読漢字は kanji-quiz / nandoku-kanji の2スラッグを統合する静的ルートへ固定）。
const GLOBAL_NAV_CATEGORIES = [
  { title: 'マッチ棒クイズ', slug: 'matchstick-quiz' },
  { title: '難読漢字', slug: 'kanji-quiz', pinnedSlug: true },
  { title: '計算クイズ', slug: 'arithmetic-quiz' },
  { title: 'クロスワード', slug: 'crossword' },
  { title: '数式パズル', slug: 'formula-puzzle' }
];

// Sanity 取得が失敗（一時障害・環境変数不備など）したときに使う静的フォールバック。
// 取得成功時は使われない。メニューが空になる事故を防ぐための最低限のカテゴリ一覧。
const FALLBACK_CATEGORIES = [
  { title: 'マッチ棒クイズ', slug: 'matchstick-quiz' },
  { title: '難読漢字', slug: 'kanji-quiz' },
  { title: '計算クイズ', slug: 'arithmetic-quiz' },
  { title: 'クロスワード', slug: 'crossword' },
  { title: '数式パズル', slug: 'formula-puzzle' },
  { title: '数字クイズ', slug: 'number-quiz' }
];

// 全カテゴリと、その公開クイズ数を取得する。
// クイズ数は references(^._id) で数える（category 参照の _id 突き合わせ。
// ^.slug のような文字列/オブジェクト不一致による数え漏れを避ける確実な方法）。
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
    && references(^._id)
    ${QUIZ_PUBLISHED_FILTER}
  ])
}`;

const CACHE_TTL = 10 * 60 * 1000; // 10分

// サーバーインスタンス内で Sanity へのリクエストを10分に1回に抑えるキャッシュ
let _cache = null;

/**
 * グローバルナビ用に、指定順のカテゴリを Sanity 実データへ突き合わせて解決する。
 * pinnedSlug の項目は固定 slug を使い、それ以外は title が一致するカテゴリの
 * 実 slug を使う（無ければフォールバック slug）。
 */
const resolveGlobalNav = (allCategories) => {
  const byTitle = new Map(
    (Array.isArray(allCategories) ? allCategories : []).map((c) => [c.title, c])
  );
  return GLOBAL_NAV_CATEGORIES.map((item) => {
    if (item.pinnedSlug) {
      return { title: item.title, slug: item.slug };
    }
    const matched = byTitle.get(item.title);
    return {
      title: item.title,
      slug: matched?.slug ?? item.slug
    };
  });
};

/**
 * 重複タイトルを1件に畳んでメニュー用カテゴリ配列を作る。
 * 公開クイズを持つカテゴリを優先し、万一すべて0件でもメニューが空にならないよう
 * フォールバックで全カテゴリを返す（＝メニューが消える事故を防ぐ）。
 */
const buildMenuCategories = (list) => {
  const valid = (Array.isArray(list) ? list : []).filter((c) => c?.slug && c?.title);
  const withQuizzes = valid.filter((c) => (c.quizCount ?? 0) > 0);
  const source = withQuizzes.length > 0 ? withQuizzes : valid;

  // 同一タイトルの重複を排除（先勝ち）
  const seen = new Set();
  const deduped = [];
  for (const c of source) {
    if (seen.has(c.title)) continue;
    seen.add(c.title);
    deduped.push({ title: c.title, slug: c.slug });
  }
  return deduped;
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
    let data = null;
    try {
      const fetched = await client.fetch(CATEGORIES_QUERY);
      const built = buildMenuCategories(fetched);
      if (built.length > 0) data = built;
    } catch (err) {
      console.error('[+layout.server] categories fetch failed', err);
    }

    if (data) {
      // 正常取得: 通常どおりキャッシュ
      _cache = { data, ts: now };
    } else if (_cache?.data?.length) {
      // 取得失敗だが直前の良いキャッシュがある: それを維持（TTLだけ更新して過剰リトライを防ぐ）
      _cache = { data: _cache.data, ts: now };
    } else {
      // 取得失敗＋キャッシュ無し: 静的フォールバックを使い、メニューを空にしない。
      // ts=0 で毎リクエスト再取得を試み、成功したら通常キャッシュに切り替える。
      _cache = { data: FALLBACK_CATEGORIES, ts: 0 };
    }
  }

  const categories = _cache.data;

  return {
    // ハンバーガーメニュー用: 全カテゴリ（公開クイズ優先・title昇順）
    categories,
    // グローバルナビ用: 指定順の5カテゴリ（実データで slug を解決）
    globalNav: resolveGlobalNav(categories)
  };
};
