// src/lib/queries/rssGunosy.groq.js
//
// GunosyFeed（グノシー / ニュースライト / auサービスToday 共通）向けクエリ。
// rssTrill.groq.js と同じ構造を踏襲しつつ、GunosyFeed 仕様で必要になる
// 以下のフィールドを追加している。
//   - _id        : guid（記事URLが変わっても不変・URL形式不可）の生成元
//   - _updatedAt : gnf:modified（記事の更新日）
//   - author     : dc:creator（記事の著者）
//   - relatedArticles : gnf:relatedLink（手動指定の関連記事を優先）

import {
  EXCLUDE_NULL_TEXT_FILTER,
  QUIZ_NOT_RETRACTED_CONDITION,
} from '$lib/queries/quizVisibility.js';

const PUBLISHED_DATETIME_FIELD = 'coalesce(publishedAt, _createdAt)';

const PUBLISHED_FILTER = `
  defined(slug.current) &&
  !(_id in path("drafts.**")) &&
  ${PUBLISHED_DATETIME_FIELD} <= now() &&
  ${QUIZ_NOT_RETRACTED_CONDITION} &&
  ${EXCLUDE_NULL_TEXT_FILTER}
`;

const IMAGE_FIELDS = `{
  alt,
  asset->{
    _id,
    url,
    mimeType,
    extension,
    metadata
  }
}`;

// gnf:relatedLink 用の最小投影。サムネイルは 4:3 / 320×240 推奨のため
// 記事側と同じ「問題画像優先」で1枚だけ拾う。
const RELATED_FIELDS = `{
  _id,
  title,
  "slug": slug.current,
  "categorySlug": category->slug.current,
  "image": select(
    defined(problemImage) => problemImage,
    defined(mainImage) => mainImage,
    null
  )${IMAGE_FIELDS}
}`;

const ITEM_FIELDS = `{
  _id,
  _updatedAt,
  reviewStatus,
  retractedAt,
  publishedAt,
  _createdAt,
  title,
  "slug": slug.current,

  problemDescription,
  hints,
  answerExplanation,
  closingMessage,

  "mainImage": select(
    defined(mainImage) => mainImage,
    defined(problemImage) => problemImage,
    defined(questionImage) => questionImage,
    null
  )${IMAGE_FIELDS},

  "problemImage": select(
    defined(problemImage) => problemImage,
    defined(questionImage) => questionImage,
    null
  )${IMAGE_FIELDS},

  "answerImage": answerImage${IMAGE_FIELDS},

  "author": author->{ name },

  "category": category->{ _id, title, name, "slug": slug.current },

  // 編集部が明示的に指定した関連記事（非公開・是正対象は除外）
  "manualRelated": relatedArticles[]->{
    _id,
    title,
    "slug": slug.current,
    "categorySlug": category->slug.current,
    "image": select(
      defined(problemImage) => problemImage,
      defined(mainImage) => mainImage,
      null
    )${IMAGE_FIELDS},
    "visible": ${QUIZ_NOT_RETRACTED_CONDITION} &&
      !(_id in path("drafts.**")) &&
      defined(slug.current) &&
      ${PUBLISHED_DATETIME_FIELD} <= now() &&
      ${EXCLUDE_NULL_TEXT_FILTER}
  },

}`;

// 取り下げ通知用。guid・link・本文・画像は出すが、関連記事の取得はしない（重いため）。
const DELETED_FIELDS = `{
  _id,
  _updatedAt,
  reviewStatus,
  retractedAt,
  publishedAt,
  _createdAt,
  title,
  "slug": slug.current,

  problemDescription,
  hints,
  answerExplanation,
  closingMessage,

  "mainImage": select(
    defined(mainImage) => mainImage,
    defined(problemImage) => problemImage,
    defined(questionImage) => questionImage,
    null
  )${IMAGE_FIELDS},

  "problemImage": select(
    defined(problemImage) => problemImage,
    defined(questionImage) => questionImage,
    null
  )${IMAGE_FIELDS},

  "answerImage": answerImage${IMAGE_FIELDS},

  "author": author->{ name },

  "category": category->{ _id, title, name, "slug": slug.current }
}`;

// active は10日ルールで絞るため配信上限の30件より多めに取得する。
export const RSS_GUNOSY_QUERY = /* groq */ `{
  "active": *[
    _type == "quiz" &&
    ${PUBLISHED_FILTER}
  ] | order(${PUBLISHED_DATETIME_FIELD} desc, _updatedAt desc)[0...40]${ITEM_FIELDS},

  "retracted": *[
    _type == "quiz" &&
    defined(slug.current) &&
    !(_id in path("drafts.**")) &&
    ${PUBLISHED_DATETIME_FIELD} <= now() &&
    reviewStatus == "retracted"
  ] | order(dateTime(coalesce(retractedAt, _updatedAt)) desc)[0...60]${DELETED_FIELDS},

  // 自分自身を除いても従来どおり最大8件を使えるよう、候補を9件取得する。
  "fallbackRelated": *[
    _type == "quiz" &&
    ${PUBLISHED_FILTER}
  ] | order(${PUBLISHED_DATETIME_FIELD} desc)[0...9]${RELATED_FIELDS},

  // 同カテゴリの新着はカテゴリごとに1回だけ取る。JS で自分自身を除いて先頭5件を使う。
  "autoRelatedByCategory": *[_type == "category"]{
    _id,
    "items": *[
      _type == "quiz" &&
      ${PUBLISHED_FILTER} &&
      references(^._id)
    ] | order(${PUBLISHED_DATETIME_FIELD} desc)[0...6]${RELATED_FIELDS}
  }
}
`;
