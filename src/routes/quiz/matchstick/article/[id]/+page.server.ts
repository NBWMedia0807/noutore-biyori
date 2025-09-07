// /src/routes/quiz/matchstick/article/[id]/+page.server.ts
import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity.js';

export const prerender = false;

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
    const quiz = await client.fetch(QUERY, { quizId: params.id });
    
    if (!quiz) {
      throw error(404, 'Quiz not found');
    }
    
    // Return the quiz data to the page
    return { quiz };
  } catch (e) {
    console.error('[matchstick/article/[id]+page.server] fetch failed', e);
    
    // If it's already an error from SvelteKit (like the 404 above), re-throw it
    if (e.status) {
      throw e;
    }
    
    // Only throw 500 for actual fetch errors
    throw error(500, 'Failed to load quiz data');
  }
};