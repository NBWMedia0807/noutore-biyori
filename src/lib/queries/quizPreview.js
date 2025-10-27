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
  problemImage{
    ...,
    asset->{ url, metadata }
  },
  mainImage{
    ...,
    asset->{ url, metadata }
  },
  answerImage{
    ...,
    asset->{ url, metadata }
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
  publishedAt,
  _createdAt
`;
