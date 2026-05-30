// src/lib/queries/rssSmartnews.groq.js

// 本文に「null」が表示される（生成バグ）記事をフィードから除外するフィルタ。
// 例：「11からnullは差が5」「6+7+null=15」のように、数値が埋まらず "null" が残ったもの。
// ※ Sanity 側の本文を修正すれば該当しなくなり、自動的にフィードへ復帰する（self-healing）。
export const EXCLUDE_NULL_TEXT_FILTER = /* groq */ `!(
  pt::text(problemDescription) match "*null*" ||
  pt::text(hints) match "*null*" ||
  pt::text(answerExplanation) match "*null*" ||
  pt::text(closingMessage) match "*null*" ||
  pt::text(body) match "*null*"
)`;

// 公開済みの記事のみを取得するクエリ
export const RSS_SMARTNEWS_QUERY = /* groq */ `
*[
  (_type == "quiz" || _type == "post") &&
  !(_id in path("drafts.**")) &&
  defined(slug.current) &&
  publishedAt < now() &&
  ${EXCLUDE_NULL_TEXT_FILTER}
] | order(publishedAt desc)[0...20]{
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
