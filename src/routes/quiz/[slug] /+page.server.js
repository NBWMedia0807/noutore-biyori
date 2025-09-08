// src/routes/quiz/[slug]/+page.server.js
export const prerender = false;                          // SSRで実行

// ★ ここを修正：SvelteKit v2 + Vercel は 'nodejs18.x' 以上の表記が必要
export const config = { runtime: 'nodejs20.x' };         // 20.x を指定（22.x でもOK）

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
  console.log('[quiz/[slug]] incoming slug:', slug);

  try {
    const quiz = await client.fetch(QUERY, { slug });
    const fetched = Boolean(quiz);
    console.log('[quiz/[slug]] fetched?', fetched);

    if (!quiz) throw error(404, 'Not found');
    return { quiz };
  } catch (e) {
    if (isHttpError(e)) throw e;
    console.error('[quiz/[slug]] unexpected error:', e);
    throw error(500, 'Failed to load quiz');
  }
};
