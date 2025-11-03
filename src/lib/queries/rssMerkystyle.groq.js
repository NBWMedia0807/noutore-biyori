// src/lib/queries/rssMerkystyle.groq.js
import { QUIZ_PUBLISHED_FILTER, QUIZ_PUBLISHED_FIELD } from '$lib/queries/quizVisibility.js';

const ORDER = `order(${QUIZ_PUBLISHED_FIELD} desc, _updatedAt desc)`;

export const RSS_MERKYSTYLE_QUERY = /* groq */ `
*[
  _type == "quiz" &&
  defined(slug.current)
  ${QUIZ_PUBLISHED_FILTER}
] | ${ORDER}[0...30]{
  _id,
  title,
  "slug": slug.current,
  body,
  problemDescription,
  publishedAt,
  _createdAt,
  _updatedAt,
  category->{
    _id,
    title,
    "slug": slug.current
  },
  "mainImage": select(
    defined(mainImage) => mainImage,
    defined(problemImage) => problemImage,
    defined(questionImage) => questionImage,
    null
  ){
    alt,
    asset->{
      _id,
      url,
      mimeType,
      extension,
      metadata{ dimensions{ width, height } }
    }
  },
  "problemImage": problemImage{
    alt,
    asset->{
      _id,
      url,
      mimeType,
      extension,
      metadata{ dimensions{ width, height } }
    }
  },
  "answerImage": answerImage{
    alt,
    asset->{
      _id,
      url,
      mimeType,
      extension,
      metadata{ dimensions{ width, height } }
    }
  },
  thumbnailUrl,
  "related": defined(category._id) ? *[
    _type == "quiz" &&
    defined(slug.current) &&
    references(^.category._id) &&
    slug.current != ^.slug &&
    defined(${QUIZ_PUBLISHED_FIELD})
    ${QUIZ_PUBLISHED_FILTER}
  ] | order(${QUIZ_PUBLISHED_FIELD} desc)[0...3]{
    title,
    "slug": slug.current,
    "mainImage": select(
      defined(mainImage) => mainImage,
      defined(problemImage) => problemImage,
      defined(questionImage) => questionImage,
      null
    ){
      alt,
      asset->{
        _id,
        url,
        mimeType,
        extension,
        metadata{ dimensions{ width, height } }
      }
    },
    thumbnailUrl
  } : []
}`;
