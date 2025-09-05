// src/routes/quiz/+page.server.js
import { client } from '$lib/sanity.js';

export const prerender = false; // ビルド時実行を避けて、実行時にSSR

const QUERY = `
*[_type=="quiz" && defined(slug.current)]{
  title,
  "slug": slug.current,
  mainImage,
  _updatedAt
} | order(_updatedAt desc)[0..50]
`;

export async function load() {
  try {
    const quizzes = await client.fetch(QUERY);
    return { quizzes };
  } catch (err) {
    console.error('Sanity fetch /quiz failed:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    });
    // エラーでもページは落とさず「空」で返す
    return { quizzes: [] };
  }
}
