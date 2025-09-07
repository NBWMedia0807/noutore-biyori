// /src/routes/quiz/spot-the-difference/article/[id]/+page.server.ts
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

// Fetch quiz data by ID
const QUERY = /* groq */ `
*[_type == "quiz" && _id == $quizId][0]{
  _id,
  _type,
  title,
  mainImage{
    asset->{ url, metadata }
  },
  problemDescription,
  hint,
  answerImage{
    asset->{ url, metadata }
  },
  answerExplanation,
  closingMessage
}
`;

export const load = async ({ params }) => {
  try {
    const client = await getSanityClient();
    
    if (!client) {
      console.warn('[spot-the-difference/article/[id]+page.server] Sanity not configured, returning 404');
      throw error(404, 'Quiz not found');
    }
    
    const quiz = await client.fetch(QUERY, { quizId: params.id });
    
    if (!quiz) {
      throw error(404, 'Quiz not found');
    }
    
    // Return the quiz data to the page
    return { quiz };
  } catch (e) {
    console.error('[spot-the-difference/article/[id]+page.server] fetch failed', e);
    
    // If it's already an error from SvelteKit (like the 404 above), re-throw it
    if (e.status) {
      throw e;
    }
    
    // For any other error, return 404 instead of 500 to avoid exposing internal errors
    throw error(404, 'Quiz not found');
  }
};