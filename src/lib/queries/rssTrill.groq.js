// src/lib/queries/rssTrill.groq.js
// rssMerkystyle.groq.js と同じ構造で記述（動作確認済み構文を踏襲）

const PUBLISHED_DATETIME_FIELD = 'dateTime(coalesce(publishedAt, _createdAt))';

const PUBLISHED_FILTER = `
  defined(slug.current) &&
  !(_id in path("drafts.**")) &&
  ${PUBLISHED_DATETIME_FIELD} <= now()
`;

export const RSS_TRILL_QUERY = /* groq */ `
*[
  _type == "quiz" &&
  ${PUBLISHED_FILTER}
] | order(${PUBLISHED_DATETIME_FIELD} desc, _updatedAt desc)[0...30]{
  _id,
  _updatedAt,
  publishedAt,
  _createdAt,
  title,
  "slug": slug.current,
  seoDescription,

  problemDescription,
  hints,
  answerExplanation,
  closingMessage,

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

  "category": category->{ _id, title, name },

  "related": defined(category._ref) ? (
    *[
      _type == "quiz" &&
      ${PUBLISHED_FILTER} &&
      references(^.category._ref) &&
      slug.current != ^.slug.current
    ]
    | order(${PUBLISHED_DATETIME_FIELD} desc)[0...3]{
      title,
      "slug": slug.current,
      "image": select(
        defined(problemImage) => problemImage,
        defined(mainImage) => mainImage,
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
      }
    }
  ) : []
}
`;
