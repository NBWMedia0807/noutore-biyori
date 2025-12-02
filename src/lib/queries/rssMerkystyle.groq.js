// src/lib/queries/rssMerkystyle.groq.js
import { shouldRestrictToPublishedContent } from '$lib/queries/quizVisibility.js';

const PUBLISHED_DATETIME_FIELD = 'dateTime(coalesce(publishedAt, _createdAt))';
const ORDER = `order(${PUBLISHED_DATETIME_FIELD} desc, _updatedAt desc)`;

// フィルタは「前の条件の末尾にくっつく」形にして、行頭が && で始まらないようにする
const MAIN_PUBLISHED_FILTER = shouldRestrictToPublishedContent
  ? ` && !(_id in path("drafts.**")) && ${PUBLISHED_DATETIME_FIELD} <= now()`
  : '';

const RELATED_PUBLISHED_FILTER = shouldRestrictToPublishedContent
  ? ` && !(_id in path("drafts.**")) && ${PUBLISHED_DATETIME_FIELD} <= now()`
  : '';

export const RSS_MERKYSTYLE_QUERY = /* groq */ `
*[
  _type == "quiz" &&
  defined(slug.current)${MAIN_PUBLISHED_FILTER}
] | ${ORDER}[0...100]{
  ...,
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
    slug.current != ^.slug${RELATED_PUBLISHED_FILTER}
  ] | order(${PUBLISHED_DATETIME_FIELD} desc)[0...3]{
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
