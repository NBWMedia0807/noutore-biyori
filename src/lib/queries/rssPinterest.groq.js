// src/lib/queries/rssPinterest.groq.js
// Pinterest 用フィード（/feed/pinterest.xml）。マッチ棒クイズのうち、
// 縦長の問題画像（pinterestImage）を持つ記事だけを流す。

import {
  EXCLUDE_NULL_TEXT_FILTER,
  QUIZ_NOT_RETRACTED_CONDITION,
} from '$lib/queries/quizVisibility.js';

const PUBLISHED_DATETIME_FIELD = 'coalesce(publishedAt, _createdAt)';

// マッチ棒クイズのスラッグは必ず "matchstick-quiz/..." で始まる（rssSmartnews と同じ判定）。
const IS_MATCHSTICK = `string::startsWith(slug.current, "matchstick-quiz/")`;

export const RSS_PINTEREST_QUERY = /* groq */ `
*[
  _type == "quiz" &&
  defined(slug.current) &&
  !(_id in path("drafts.**")) &&
  ${PUBLISHED_DATETIME_FIELD} <= now() &&
  ${QUIZ_NOT_RETRACTED_CONDITION} &&
  ${EXCLUDE_NULL_TEXT_FILTER} &&
  ${IS_MATCHSTICK} &&
  defined(pinterestImage.asset)
] | order(${PUBLISHED_DATETIME_FIELD} desc, _updatedAt desc)[0...50]{
  _id,
  publishedAt,
  _createdAt,
  title,
  "slug": slug.current,
  seoDescription,
  problemDescription,
  "pinterestImage": pinterestImage.asset->{
    url,
    size,
    mimeType
  }
}
`;
