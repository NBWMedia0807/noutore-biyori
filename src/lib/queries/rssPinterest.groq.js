// src/lib/queries/rssPinterest.groq.js
//
// Pinterest 用フィード（/feed/pinterest.xml）向けクエリ。
// マッチ棒クイズのうち、縦長画像（pinterestImage）が生成済みの問題だけを取る。
// 公開判定は他フィード（rssTrill / rssGunosy）と同じ条件にそろえている。

import {
  EXCLUDE_NULL_TEXT_FILTER,
  QUIZ_NOT_RETRACTED_CONDITION,
} from '$lib/queries/quizVisibility.js';

const PUBLISHED_DATETIME_FIELD = 'coalesce(publishedAt, _createdAt)';

export const RSS_PINTEREST_QUERY = /* groq */ `
*[
  _type == "quiz" &&
  defined(slug.current) &&
  string::startsWith(slug.current, "matchstick-quiz/") &&
  !(_id in path("drafts.**")) &&
  ${PUBLISHED_DATETIME_FIELD} <= now() &&
  ${QUIZ_NOT_RETRACTED_CONDITION} &&
  ${EXCLUDE_NULL_TEXT_FILTER} &&
  defined(pinterestImage.asset)
] | order(${PUBLISHED_DATETIME_FIELD} desc, _updatedAt desc)[0...50]{
  _id,
  _createdAt,
  publishedAt,
  title,
  "slug": slug.current,
  seoDescription,
  problemDescription,
  "pinterestImage": pinterestImage{
    asset->{ url, size, mimeType }
  }
}
`;
