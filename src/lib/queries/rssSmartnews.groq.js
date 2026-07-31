// src/lib/queries/rssSmartnews.groq.js
import {
  EXCLUDE_NULL_TEXT_FILTER,
  QUIZ_NOT_RETRACTED_CONDITION,
} from '$lib/queries/quizVisibility.js';

// 本文の「null」除外フィルタと是正対象の除外条件は quizVisibility.js に集約した
// （サイト本体・sitemap・他フィードにも同じ判定を適用するため）。

// 公開済みの記事のみを取得するクエリ
export const RSS_SMARTNEWS_QUERY = /* groq */ `
*[
  (_type == "quiz" || _type == "post") &&
  !(_id in path("drafts.**")) &&
  defined(slug.current) &&
  publishedAt < now() &&
  ${QUIZ_NOT_RETRACTED_CONDITION} &&
  ${EXCLUDE_NULL_TEXT_FILTER}
]
// マッチ棒クイズを必ずフィード先頭に固定する。
// 配信先（SmartNews/ママテナ/イチオシ）が「上位N件のみ取り込む」挙動でも、
// マッチ棒が取り込み枠から漏れないようにするため。マッチ棒のスラッグは
// 必ず "matchstick-quiz/..." で始まるので、それを 0（先頭）に寄せる。
// 同一グループ内は従来どおり公開日の新しい順。全体上限は30件。
| order(select(string::startsWith(slug.current, "matchstick-quiz/") => 0, 1) asc, publishedAt desc)[0...30]{
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

  // 関連記事
  "relatedLinks": *[
    _type == 'quiz' &&
    !(_id in path("drafts.**")) &&
    defined(slug.current) &&
    publishedAt < now() &&
    _id != ^._id && // 自分自身を除外
    category._ref == ^.category._ref && // 同じカテゴリ (展開前の参照IDと比較)
    ${QUIZ_NOT_RETRACTED_CONDITION} && // 是正対象の記事は関連記事からも除外
    ${EXCLUDE_NULL_TEXT_FILTER} // 本文に "null" が出る記事は関連記事からも除外
  ] | order(publishedAt desc)[0...3]{
    title,
    "slug": slug.current,
    _type,
    // カテゴリ別 canonical URL を組み立てるためのカテゴリスラッグ
    "categorySlug": category->slug.current,
    // 【修正】関連記事の画像アセット情報を追加
    mainImage{asset->},
    problemImage{asset->}
  }
}
`;
