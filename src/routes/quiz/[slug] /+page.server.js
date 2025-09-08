// src/routes/quiz/[slug]/+page.server.js
export const prerender = false;        // このページは SSR で実行
export const runtime = 'nodejs';       // Vercel で Node 実行（ログが確実に出る）

import { error, isHttpError } from '@sveltejs/kit';
import { client } from '$lib/sanity.js';

const QUERY = /* groq */ `
*[_type == "quiz" && (slug.current == $slug || _id == $slug)][0]{
  _id,
  title,
  "slug": slug.current,
  body,
  mainImage{ asset->{ url, metadata } }
}
`;

export const load = async ({ params }) => {
  const slug = params.slug;
  console.log('[quiz/[slug]] incoming slug:', slug);   // ← Vercel Logs で必ず見える

  try {
    const quiz = await client.fetch(QUERY, { slug });
    const fetched = Boolean(quiz);
    console.log('[quiz/[slug]] fetched?', fetched);    // true / false が出る

    if (!quiz) throw error(404, 'Not found');
    return { quiz };
  } catch (e) {
    if (isHttpError(e)) throw e;                       // 404 などはそのまま返す
    console.error('[quiz/[slug]] unexpected error:', e);
    throw error(500, 'Failed to load quiz');
  }
};
