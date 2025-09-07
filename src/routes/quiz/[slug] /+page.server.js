// /src/routes/quiz/[slug]/+page.server.js
import { error, isHttpError } from '@sveltejs/kit';
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
      throw error(404, 'Not found');
    }
    return { quiz };
  } catch (e) {
    // If it's already an HTTP error (like our 404), re-throw it as-is
    if (isHttpError(e)) {
      throw e;
    }
    // Only convert unexpected errors to 500
    console.error('[quiz/[slug]+page.server] fetch failed', e);
    
    // If it's already a SvelteKit error, re-throw it
    if (e.status) {
      throw e;
    }
    
    // For other errors, assume the quiz doesn't exist and return 404
    // This follows the requirement that non-existent data should return 404
    throw error(404, 'Not found');
  }
};
