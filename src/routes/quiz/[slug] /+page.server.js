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
    if (!quiz) {
      console.log(`[quiz/[slug]] Quiz not found: ${params.slug}`);
      throw error(404, 'Quiz not found');
    }
    console.log(`[quiz/[slug]] Quiz loaded: ${quiz.title}`);
    return { quiz };
  } catch (e) {
    // Re-throw SvelteKit errors (like 404) without modification
    if (e?.status) {
      throw e;
    }
    // Only log and throw 500 for actual fetch/network errors
    console.error(`[quiz/[slug]] Fetch failed for slug: ${params.slug}`, e.message);
    throw error(500, 'Server error while loading quiz');
  }
};
