// src/lib/queries/rssSmartnews.groq.js

// 【修正】条件を緩和したシンプル版
// 日付チェックを外し、単に「postかquizで、スラッグがあるもの」を最新順に取得します
export const RSS_SMARTNEWS_QUERY = /* groq */ `
*[
  (_type == "post" || _type == "quiz") &&
  defined(slug.current) &&
  !(_id in path("drafts.**"))
] | order(_createdAt desc)[0...20]{
  title,
  "slug": slug.current,
  
  // 日付（publishedAtがなければ作成日を使う）
  "publishedAt": coalesce(publishedAt, _createdAt),
  
  // 本文データ
  body,
  problemDescription,
  answerExplanation,
  closingMessage,

  // 画像データ
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

  // カテゴリー
  "category": category->{
    name,
    title
  }
}
`;
