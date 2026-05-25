// src/lib/queries/rssMerkystyle.groq.js

const PUBLISHED_DATETIME_FIELD = 'dateTime(coalesce(publishedAt, _createdAt))';

// 公開判定（ドラフト除外＆公開日時チェック）
const PUBLISHED_FILTER = `
  defined(slug.current) &&
  !(_id in path("drafts.**")) &&
  ${PUBLISHED_DATETIME_FIELD} <= now()
`;

export const RSS_MERKYSTYLE_QUERY = /* groq */ `
*[
  _type == "quiz" &&
  ${PUBLISHED_FILTER}
] | order(${PUBLISHED_DATETIME_FIELD} desc, _updatedAt desc)[0...100]{
  ...,
  "slug": slug.current,

  // ==== 画像取得 ====
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

  // ==== 関連クイズ ====
  "related": defined(category._ref) ? (
    *[
      _type == "quiz" &&
      ${PUBLISHED_FILTER} &&
      references(^.category._ref) &&
      slug.current != ^.slug
    ]
    | order(${PUBLISHED_DATETIME_FIELD} desc)[0...3]{
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
    }
  ) : []
}
`;
