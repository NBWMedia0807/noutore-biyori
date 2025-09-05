// /src/routes/quiz/[slug]/+page.server.js
import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity.js';

export const prerender = false;

// slug.current か _id のどちらでも取れるように両対応
const QUERY = /* groq */ `
*[_type == "quiz" && (slug.current == $slug || _id == $slug)][0]{
  _id,
  title,
  "slug": slug.current,
  body,
  mainImage{
    asset->{ url, metadata }
  }
}
`;

export const load = async ({ params }) => {
  try {
    const quiz = await client.fetch(QUERY, { slug: params.slug });
    if (!quiz) throw error(404, 'Not found');
    return { quiz };
  } catch (e) {
    console.error('[quiz/[slug]+page.server] fetch failed', e);
    throw error(500, 'Failed to load quiz');
  }
};
