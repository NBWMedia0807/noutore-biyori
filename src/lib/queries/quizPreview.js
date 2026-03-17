// src/lib/queries/quizPreview.js
export const QUIZ_PREVIEW_PROJECTION = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  category->{
    _id,
    title,
    "slug": slug.current
  },
  "problemImage": select(
    defined(problemImage) => problemImage,
    defined(questionImage) => questionImage,
    defined(mainImage) => mainImage,
    null
  ){
    ...,
    asset->{ "_ref": _id, url, metadata }
  },
  "mainImage": select(
    defined(mainImage) => mainImage,
    defined(problemImage) => problemImage,
    defined(questionImage) => questionImage,
    null
  ){
    ...,
    asset->{ "_ref": _id, url, metadata }
  },
  answerImage{
    ...,
    asset->{ "_ref": _id, url, metadata }
  },
  "thumbnailUrl": coalesce(
    problemImage.asset->url,
    mainImage.asset->url,
    answerImage.asset->url
  ),
  "viewCount": coalesce(
    metrics.pageViews,
    metrics.views,
    analytics.pageViews,
    stats.pageViews,
    popularity.pageViews,
    popularity.views,
    0
  ),
  "likeCount": coalesce(
    metrics.likes,
    analytics.likes,
    stats.likes,
    popularity.likes,
    popularity.reactions,
    0
  ),
  "popularityScore": coalesce(
    popularity.score,
    metrics.score,
    analytics.score,
    stats.score,
    0
  ),
  difficulty,
  readingTime,
  "textLength": length(pt::text(coalesce(problemDescription, body))),
  publishedAt,
  _createdAt
`;
