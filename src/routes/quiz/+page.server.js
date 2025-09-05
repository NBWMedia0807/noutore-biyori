// src/routes/quiz/+page.server.js
import { client } from '$lib/sanity.js';

export const prerender = false;   // SSRでSanityから読む
export const csr = true;          // クライアント動作OK

// 最小で安全な一覧クエリ（slug未設定でも _id を使ってリンク可能）
const QUERY = /* groq */ `
*[_type == "quiz"] | order(_updatedAt desc)[0..50]{
  _id,
  title,
  "slug": coalesce(slug.current, _id),
  // 直接URL化して返すとフロントが楽
  "mainImageUrl": mainImage.asset->url
}
`;

export async function load() {
  try {
    const quizzes = await client.fetch(QUERY);
    // デバッグが必要なら下記が Function Logs に出ます
    console.log('[quiz/+page.server] quizzes:', quizzes?.length ?? 0);
    return { quizzes };
  } catch (err) {
    console.error('[quiz/+page.server] fetch failed:', err);
    // 500を避けて空配列を返し、ページは描画させる
    return { quizzes: [] };
  }
}
