// src/lib/queries/rssSmartnews.groq.js
import {
  EXCLUDE_NULL_TEXT_FILTER,
  QUIZ_NOT_RETRACTED_CONDITION,
} from '$lib/queries/quizVisibility.js';

// 本文の「null」除外フィルタと是正対象の除外条件は quizVisibility.js に集約した
// （サイト本体・sitemap・他フィードにも同じ判定を適用するため）。

// マッチ棒クイズのスラッグは必ず "matchstick-quiz/..." で始まる。
// カテゴリ slug はナビとテストスタブで揺れているため、判定はスラッグ前方一致で揃える
// （$lib/rss/smartnewsRecirculation.js と同じ規則）。
const IS_MATCHSTICK = `string::startsWith(slug.current, "matchstick-quiz/")`;

// 公開してよい記事を通す条件。下の2本のクエリで完全に同じものを使う。
const PUBLISHED_FILTER = /* groq */ `
  (_type == "quiz" || _type == "post") &&
  !(_id in path("drafts.**")) &&
  defined(slug.current) &&
  publishedAt < now() &&
  ${QUIZ_NOT_RETRACTED_CONDITION} &&
  ${EXCLUDE_NULL_TEXT_FILTER}
`;

// item の組み立てに必要なフィールド。下の2本のクエリで共通。
const ARTICLE_PROJECTION = /* groq */ `{
  _id,
  _type,
  publishedAt,
  _createdAt,
  title,
  "slug": slug.current,
  seoDescription,

  // --- Post用フィールド ---
  body,

  // --- Quiz用フィールド ---
  problemDescription,
  hints, 
  answerExplanation,
  closingMessage,

  // --- 画像関連 ---
  mainImage,
  problemImage,
  answerImage,

  // カテゴリ
  // 修正: -> で展開した先のドキュメントには _ref ではなく _id が存在します
  "category": category->{
    _id,
    name,
    title,
    "slug": slug.current
  },

  // 同カテゴリの新着プール。
  // 記事下の回遊枠（広告枠2 + 本文末リンク3）へ $lib/rss/smartnewsRecirculation.js が
  // 先頭から順に割り当てる。最大5件使うため、スキップが出ても枠が空かないよう8件取る。
  "relatedLinks": *[
    _type == 'quiz' &&
    !(_id in path("drafts.**")) &&
    defined(slug.current) &&
    publishedAt < now() &&
    _id != ^._id && // 自分自身を除外
    category._ref == ^.category._ref && // 同じカテゴリ (展開前の参照IDと比較)
    ${QUIZ_NOT_RETRACTED_CONDITION} && // 是正対象の記事は関連記事からも除外
    ${EXCLUDE_NULL_TEXT_FILTER} // 本文に "null" が出る記事は関連記事からも除外
  ] | order(publishedAt desc)[0...8]{
    title,
    "slug": slug.current,
    _type,
    // カテゴリ別 canonical URL を組み立てるためのカテゴリスラッグ
    "categorySlug": category->slug.current,
    // 【修正】関連記事の画像アセット情報を追加
    mainImage{asset->},
    problemImage{asset->}
  }
}`;

// ── なぜクエリを2本に分けるのか ──────────────────────────────
// 以前は1本のクエリで「マッチ棒を先頭に寄せてから上位30件」を取っていた。
// マッチ棒は1日5本生成＋毎日2本を再公開しており在庫が常に30本を超えるため、
// 30枠すべてがマッチ棒で埋まり、他カテゴリが構造的に1本も配信されない状態だった
// （2026-09 の GA4 実測でも、配信の93%がマッチ棒に集中していた）。
//
// 枠の配分は $lib/rss/feedSlots.js の selectSmartnewsItems() が決める。
// ここでは「マッチ棒の候補」と「それ以外の候補」を別々に渡すだけにして、
// 配分ロジックをテスト可能な純粋関数側に寄せている。
// 絞り込み条件（PUBLISHED_FILTER）と投影（ARTICLE_PROJECTION）は2本で同一。

/** マッチ棒クイズの候補（公開日の新しい順）。フィードの大半を占める。 */
export const RSS_SMARTNEWS_MATCHSTICK_QUERY = /* groq */ `
*[
  ${PUBLISHED_FILTER} &&
  ${IS_MATCHSTICK}
] | order(publishedAt desc)[0...30]${ARTICLE_PROJECTION}
`;

// 非マッチ棒は1日16本（8カテゴリ×2本）生成されているので、
// 40件あれば全カテゴリの最新記事が確実に含まれる。
/** マッチ棒以外の候補（公開日の新しい順）。カテゴリごとの枠を埋めるのに使う。 */
export const RSS_SMARTNEWS_OTHERS_QUERY = /* groq */ `
*[
  ${PUBLISHED_FILTER} &&
  !(${IS_MATCHSTICK})
] | order(publishedAt desc)[0...40]${ARTICLE_PROJECTION}
`;
