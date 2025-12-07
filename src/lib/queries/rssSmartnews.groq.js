// src/lib/queries/rssSmartnews.groq.js

// 公開判定（シンプル版：スラッグがあり、下書きでなければOKとする）
const PUBLISHED_FILTER = `
  defined(slug.current) &&
  !(_id in path("drafts.**"))
`;

export const RSS_SMARTNEWS_QUERY = /* groq */ `
*[
  (_type == "post" || _type == "quiz") &&
  ${PUBLISHED_FILTER}
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
