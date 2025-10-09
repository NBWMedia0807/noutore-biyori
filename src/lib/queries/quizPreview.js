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
  publishedAt,
  _createdAt
`;
