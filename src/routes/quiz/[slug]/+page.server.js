// src/routes/quiz/[slug]/+page.server.js
export const prerender = false;                          // SSRで実行

// ★ ここを修正：SvelteKit v2 + Vercel は 'nodejs18.x' 以上の表記が必要
export const config = { runtime: 'nodejs20.x' };         // 20.x を指定（22.x でもOK）

import { error, isHttpError } from '@sveltejs/kit';
import { client } from '$lib/sanity.server.js';

const QUERY = /* groq */ `
*[_type == "quiz" && (slug.current == $slug || _id == $slug)][0]{
  _id,
  title,
  "slug": slug.current,
  category->{ _id, title },
  problemDescription,
  hint,
  "mainImage": 問題画像{ asset->{ url, metadata } },
  answerImage{ asset->{ url, metadata } },
  answerExplanation,
  closingMessage
}
`;

export const load = async ({ params }) => {
  const slug = params.slug;
  console.log('[quiz/[slug]] incoming slug:', slug);

  try {
    console.log('[quiz/[slug]] Executing query with slug:', slug);
    const quiz = await client.fetch(QUERY, { slug });
    console.log('[quiz/[slug]] Raw query result:', JSON.stringify(quiz, null, 2));
    const fetched = Boolean(quiz);
    console.log('[quiz/[slug]] fetched?', fetched);

    if (!quiz) {
      console.log('[quiz/[slug]] No quiz found, throwing 404');
      throw error(404, 'Not found');
    }
    console.log('[quiz/[slug]] Returning quiz data');
    return { quiz };
  } catch (e) {
    if (isHttpError(e)) {
      console.log('[quiz/[slug]] HTTP error:', e.status, e.body);
      throw e;
    }
    console.error('[quiz/[slug]] unexpected error:', e);
    throw error(500, 'Failed to load quiz');
  }
};
