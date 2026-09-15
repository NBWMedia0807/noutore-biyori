// src/lib/rss/smartnewsRecirculation.js
//
// SmartNews（および同一フィードを共有するイチオシ・ママテナ）の記事下に出す
// 「回遊枠」への記事の割り当て。
//
// SvelteKit 固有の import（$app / $env / $lib）を持たない純粋なモジュールにしてあるため、
// tests/smartnews-recirculation.test.mjs からそのまま import して検証できる。
// （$lib/rss/gunosyFeed.js・$lib/server/landing-log.js と同じ方針）
//
// ── 何のための枠か ──────────────────────────────────────
// SmartView（アプリ内で記事が完結する表示形式）では自社サイトの HTML は読み込まれず、
// 本文は問題から解答まで全文が配信される。読者を noutorebiyori.com へ連れてくる導線は
// この回遊枠だけなので、8枠すべてを別々の記事で埋めきることを最優先にしている。
//
// ── 枠の内訳（合計8枠） ─────────────────────────────────
//   snf:sponsoredLink  2枠  サムネイル付き。広告枠として最も目立つ
//   本文末テキストリンク 3枠  画像なし。SmartFormat ガイドラインで最大3本・テキストのみ
//   snf:relatedLink    3枠  サムネイル付き。マッチ棒クイズの「推し枠」に固定する
//
// 以前は本文末テキストリンクと snf:relatedLink が同じ relatedLinks 配列を回しており、
// 8枠あっても指している記事は5本（うち3本が二重掲載）だった。

import {
  SMARTNEWS_RECIRCULATION_CONTENT,
  SMARTNEWS_RECIRCULATION_UTM,
  withFeedUtm,
} from '../utils/feedUtm.js';

export { SMARTNEWS_RECIRCULATION_CONTENT };

/** マッチ棒クイズのスラッグ接頭辞。カテゴリ参照ではなくスラッグで判定する。 */
export const MATCHSTICK_SLUG_PREFIX = 'matchstick-quiz/';

/** 各枠の数。SmartFormat ガイドライン上、本文末テキストリンクは3本を超えられない。 */
export const AD_SLOT_COUNT = 2;
export const BODY_LINK_COUNT = 3;
export const RELATED_SLOT_COUNT = 3;

/**
 * マッチ棒クイズかどうか。
 *
 * カテゴリ slug は表記が揺れている（ナビは `matchstick-quiz` / スタブは `matchstick`）一方、
 * スラッグは必ず `matchstick-quiz/article/...` の形になる。配信クエリ側の並べ替えも
 * 同じ接頭辞で判定しているため、ここでも揃えている。
 *
 * @param {string} [slug]
 */
export const isMatchstickSlug = (slug) =>
  typeof slug === 'string' && slug.startsWith(MATCHSTICK_SLUG_PREFIX);

/**
 * CDATA 内に置く HTML 属性値のエスケープ。
 *
 * CDATA なので XML パーサは素通しするが、中身は HTML として解釈される。
 * UTM 付きURLの & をそのまま書くと実体参照として誤解釈されうるため、
 * 本文末テキストリンクの href はこれを通す。
 * （XML 属性として出す snf:sponsoredLink / snf:relatedLink 側は escapeXml を使う）
 *
 * @param {string} value
 */
export const escapeHtmlAttr = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');

/**
 * 回遊枠のリンクURL。どの枠のクリックかを GA4 で見分けられるよう utm_content を付ける。
 *
 * item の <link> には付けない（SmartFormat 仕様が <link> から UTM を除くことを推奨しているため）。
 * ここで扱うのは記事下から自社サイトへ出ていく外向きリンクだけ。
 *
 * canonical URL の組み立ては配信側の事情（308リダイレクト回避）を持つため、
 * `buildQuizUrl` を注入して受け取る（gunosyFeed.js と同じ方針）。
 *
 * @param {{ slug: string, categorySlug?: string }} quiz
 * @param {string} content SMARTNEWS_RECIRCULATION_CONTENT の値
 * @param {{ buildQuizUrl: (slug: string, categorySlug?: string) => string, fallbackCategorySlug?: string }} deps
 */
export const buildRecirculationUrl = (quiz, content, { buildQuizUrl, fallbackCategorySlug }) =>
  withFeedUtm(buildQuizUrl(quiz.slug, quiz.categorySlug ?? fallbackCategorySlug), {
    ...SMARTNEWS_RECIRCULATION_UTM,
    content,
  });

/** 枠に出せる記事か（リンクとタイトルが揃っているか）。 */
const isUsable = (quiz) =>
  Boolean(quiz) && typeof quiz.slug === 'string' && quiz.slug !== '' && Boolean(quiz.title);

/**
 * 記事下の回遊枠へ記事を割り当てる。
 *
 * 表示中の記事と、既に他の枠で使った記事は必ず除外する（`used` セット）。
 * 枠が埋まらない場合はフォールバックのプールから順に補充するので、
 * カテゴリの記事数が少なくても空き枠が出ない。
 *
 * 割り当ての順序:
 *
 * | 表示中の記事   | 広告枠2        | 本文末3        | 関連記事枠3      |
 * | -------------- | -------------- | -------------- | ---------------- |
 * | マッチ棒以外   | 同カテゴリ 1-2 | 同カテゴリ 3-5 | マッチ棒 1-3     |
 * | マッチ棒       | マッチ棒 1-2   | マッチ棒 3-5   | マッチ棒 6-8     |
 *
 * マッチ棒以外の記事では関連記事枠を先に確保する。マッチ棒は媒体の売りなので、
 * 同カテゴリのプールが浅いときに広告枠のフォールバックへ食われないようにするため。
 *
 * @param {{
 *   article?: { slug?: string },
 *   categoryPool?: Array<object>,
 *   matchstickPool?: Array<object>,
 *   globalPool?: Array<object>,
 * }} input
 * @returns {{ adSlots: Array<object>, bodyLinks: Array<object>, relatedSlots: Array<object> }}
 */
export const allocateRecirculationSlots = ({
  article = {},
  categoryPool = [],
  matchstickPool = [],
  globalPool = [],
} = {}) => {
  const used = new Set();
  if (typeof article?.slug === 'string' && article.slug) {
    used.add(article.slug);
  }

  /** プールの先頭から、未使用の記事を最大 n 件取り出す。 */
  const take = (pool, n) => {
    const picked = [];
    if (n <= 0) return picked;
    for (const quiz of Array.isArray(pool) ? pool : []) {
      if (picked.length >= n) break;
      if (!isUsable(quiz) || used.has(quiz.slug)) continue;
      used.add(quiz.slug);
      picked.push(quiz);
    }
    return picked;
  };

  /** n 件になるまで、渡されたプールを順に使って埋める。 */
  const fillSlots = (n, ...pools) => {
    const slots = [];
    for (const pool of pools) {
      if (slots.length >= n) break;
      slots.push(...take(pool, n - slots.length));
    }
    return slots;
  };

  if (isMatchstickSlug(article?.slug)) {
    // マッチ棒記事: 同じプールから通しで取るので 1-2 / 3-5 / 6-8 になる
    const adSlots = fillSlots(AD_SLOT_COUNT, matchstickPool, globalPool);
    const bodyLinks = fillSlots(BODY_LINK_COUNT, matchstickPool, globalPool);
    const relatedSlots = fillSlots(RELATED_SLOT_COUNT, matchstickPool, globalPool);
    return { adSlots, bodyLinks, relatedSlots };
  }

  const relatedSlots = fillSlots(RELATED_SLOT_COUNT, matchstickPool, categoryPool, globalPool);
  const adSlots = fillSlots(AD_SLOT_COUNT, categoryPool, globalPool);
  const bodyLinks = fillSlots(BODY_LINK_COUNT, categoryPool, globalPool);
  return { adSlots, bodyLinks, relatedSlots };
};
