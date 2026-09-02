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

// 取得件数は 40 件。フィード側で「公開から10日以内」に絞り込むため、
// 絞り込み後も十分な件数が残るよう配信上限（30件）より多めに取る。
export const RSS_GUNOSY_QUERY = /* groq */ `
*[
  _type == "quiz" &&
  ${PUBLISHED_FILTER}
] | order(${PUBLISHED_DATETIME_FIELD} desc, _updatedAt desc)[0...40]{
  _id,
  _updatedAt,
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

  // 手動指定が3件に満たない場合の補充用（同カテゴリの新着）
  "autoRelated": select(
    defined(category._ref) => *[
      _type == "quiz" &&
      ${PUBLISHED_FILTER} &&
      references(^.category._ref) &&
      _id != ^._id
    ]
    | order(${PUBLISHED_DATETIME_FIELD} desc)[0...5]${RELATED_FIELDS},
    []
  ),

  // 同カテゴリだけでは3枠が埋まらない場合の最終補充（全カテゴリの新着）。
  // カテゴリの記事数が少ない、またはカテゴリ未設定の記事では autoRelated が
  // 3件に届かず、gnf:relatedLink が欠けたまま配信されていた。
  // relatedLink はアプリ内で本文を読んだ人をサイトへ連れてくる唯一の導線なので、
  // 空き枠を作らないことを優先する。
  "fallbackRelated": *[
    _type == "quiz" &&
    ${PUBLISHED_FILTER} &&
    _id != ^._id
  ]
  | order(${PUBLISHED_DATETIME_FIELD} desc)[0...8]${RELATED_FIELDS}
}
`;
