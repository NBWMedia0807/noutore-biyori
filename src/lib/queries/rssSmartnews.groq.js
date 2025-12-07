// src/lib/queries/rssSmartnews.groq.js

const PUBLISHED_DATETIME_FIELD = 'dateTime(coalesce(publishedAt, _createdAt))';

// 公開判定（ドラフト除外＆公開日時チェック）
const PUBLISHED_FILTER = `
  defined(slug.current) &&
  !(_id in path("drafts.**")) &&
  ${PUBLISHED_DATETIME_FIELD} <= now()
`;

export const RSS_SMARTNEWS_QUERY = /* groq */ `
*[
  _type == "quiz" &&
  ${PUBLISHED_FILTER}
] | order(${PUBLISHED_DATETIME_FIELD} desc, _updatedAt desc)[0...20]{
  _id,
  _createdAt,
  _updatedAt,
  publishedAt,
  title,
  "slug": slug.current,
  body,
  problemDescription,
  answerExplanation,
  closingMessage,

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
    name
  }
}
`;
