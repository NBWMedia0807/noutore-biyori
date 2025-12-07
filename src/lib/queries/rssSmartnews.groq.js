// src/lib/queries/rssSmartnews.groq.js

const PUBLISHED_DATETIME_FIELD = 'dateTime(coalesce(publishedAt, _createdAt))';

// 公開判定
const PUBLISHED_FILTER = `
  defined(slug.current) &&
  !(_id in path("drafts.**")) &&
  ${PUBLISHED_DATETIME_FIELD} <= now()
`;

export const RSS_SMARTNEWS_QUERY = /* groq */ `
*[
  (_type == "post" || _type == "quiz") &&
  ${PUBLISHED_FILTER}
] | order(${PUBLISHED_DATETIME_FIELD} desc, _updatedAt desc)[0...20]{
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
  hints, // ★正しいフィールド名に変更
  answerExplanation,
  closingMessage,

  // --- 画像関連 ---
  // メイン画像（サムネイル用）
  "mainImage": mainImage.asset->{ url, mimeType },
  
  // 問題画像（本文表示用）
  "problemImage": problemImage.asset->{ url, mimeType },
  
  // 正解画像（解説表示用）
  "answerImage": answerImage.asset->{ url, mimeType },

  // カテゴリ
  "category": category->{
    name,
    title
  }
}
`;
