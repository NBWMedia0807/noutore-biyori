// /src/routes/quiz/[slug]/+page.server.js
import { error } from '@sveltejs/kit';

export const prerender = false;

async function getSanityClient() {
  try {
    // Check if Sanity client is properly configured
    if (!process.env.SANITY_PROJECT_ID) {
      return null;
    }
    
    const { client } = await import('$lib/sanity.js');
    return client;
  } catch (e) {
    console.error('Failed to load Sanity client:', e);
    return null;
  }
}

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
    const client = await getSanityClient();
    
    if (!client) {
      console.warn('[quiz/[slug]+page.server] Sanity not configured, returning 404');
      throw error(404, 'Not found');
    }
    
    const quiz = await client.fetch(QUERY, { slug: params.slug });
    if (!quiz) throw error(404, 'Not found');
    return { quiz };
  } catch (e) {
    console.error('[quiz/[slug]+page.server] fetch failed', e);
    // If it's already an error from SvelteKit (like the 404 above), re-throw it
    if (e.status) {
      throw e;
    }
    // For any other error, return 404 instead of 500
    throw error(404, 'Not found');
  }
};
