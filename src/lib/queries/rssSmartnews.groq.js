// src/lib/queries/rssSmartnews.groq.js

// 記事の公開・下書きステータスに関係なく、とにかくquizとpostタイプの上位20件を取得するクエリ
export const RSS_SMARTNEWS_QUERY = /* groq */ `
*[
  _type == "quiz" || _type == "post"
] | order(_createdAt desc)[0...20]{
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
  "category": category->{
    name,
    title
  }
}
`;
