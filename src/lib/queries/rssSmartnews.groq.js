// src/lib/queries/rssSmartnews.groq.js

const PUBLISHED_DATETIME_FIELD = 'dateTime(coalesce(publishedAt, _createdAt))';

// 公開判定（ドラフト除外＆公開日時チェック）
const PUBLISHED_FILTER = `
  defined(slug.current) &&
  !(_id in path("drafts.**")) &&
  ${PUBLISHED_DATETIME_FIELD} <= now()
`;

// 【修正】_typeが "post" または "quiz" の両方を取得するように変更
export const RSS_SMARTNEWS_QUERY = /* groq */ `
*[
  (_type == "post" || _type == "quiz") &&
  ${PUBLISHED_FILTER}
] | order(${PUBLISHED_DATETIME_FIELD} desc, _updatedAt desc)[0...20]{
  _id,
  _createdAt,
  _updatedAt,
  publishedAt,
  title,
  "slug": slug.current,
  
  // 本文（postの場合）
  body,
  
  // クイズ用フィールド（quizの場合）
  problemDescription,
  answerExplanation,
  closingMessage,

  // 画像の取得（mainImage優先、なければクイズ用画像）
  "mainImage": select(
    defined(mainImage) => mainImage,
    defined(problemImage) => problemImage,
    defined(questionImage) => questionImage,
    null
  ){
    asset->{
      url,
      mimeType
    }
  },

  "category": category->{
    name,
    title
  }
}
`;
