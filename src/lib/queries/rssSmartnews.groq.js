// src/lib/queries/rssSmartnews.groq.js

// 公開済みの記事のみを取得するクエリ
export const RSS_SMARTNEWS_QUERY = /* groq */ `
*[
  (_type == "quiz" || _type == "post") &&
  publishedAt < now()
] | order(publishedAt desc)[0...20]{
  _id,
  _type,
  publishedAt,
  _createdAt,
  title,
  "slug": slug.current,
  
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
    title
  },

  // 関連記事
  "relatedLinks": *[
    _type == 'quiz' &&
    publishedAt < now() &&
    _id != ^._id && // 自分自身を除外
    category._ref == ^.category._ref // 同じカテゴリ (展開前の参照IDと比較)
  ] | order(publishedAt desc)[0...3]{
    title,
    "slug": slug.current,
    _type,
    // 【修正】関連記事の画像アセット情報を追加
    mainImage{asset->},
    problemImage{asset->}
  }
}
`;
