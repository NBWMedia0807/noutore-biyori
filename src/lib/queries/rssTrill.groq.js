// src/lib/queries/rssTrill.groq.js

const PUBLISHED_DATETIME_FIELD = 'coalesce(publishedAt, _createdAt)';

const PUBLISHED_FILTER = `
  defined(slug.current) &&
  !(_id in path("drafts.**")) &&
  ${PUBLISHED_DATETIME_FIELD} <= now()
`;

// select()の結果に{}プロジェクションは不可のため、各ブランチ内で展開する
const ASSET_PROJECTION = /* groq */ `asset->{
    _id,
    url,
    mimeType,
    extension,
    metadata{ dimensions{ width, height } }
  }`;

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

  "problemImage": problemImage{ alt, ${ASSET_PROJECTION} },
  "answerImage": answerImage{ alt, ${ASSET_PROJECTION} },
  "mainImage": select(
    defined(mainImage) => mainImage{ alt, ${ASSET_PROJECTION} },
    defined(problemImage) => problemImage{ alt, ${ASSET_PROJECTION} },
    defined(questionImage) => questionImage{ alt, ${ASSET_PROJECTION} },
    null
  ),

  "category": category->{ _id, title, name },

  "related": defined(category._ref) ? (
    *[
      _type == "quiz" &&
      ${PUBLISHED_FILTER} &&
      references(^.category._ref) &&
      slug.current != ^.slug.current
    ] | order(${PUBLISHED_DATETIME_FIELD} desc)[0...3]{
      title,
      "slug": slug.current,
      "image": select(
        defined(problemImage) => problemImage{ alt, ${ASSET_PROJECTION} },
        defined(mainImage) => mainImage{ alt, ${ASSET_PROJECTION} },
        null
      )
    }
  ) : []
}
`;
