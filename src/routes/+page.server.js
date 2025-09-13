// src/routes/+page.server.js
import { client } from '$lib/sanity.server.js';

const QUIZZES_QUERY = /* groq */ `
*[_type == "quiz"] | order(_createdAt desc) {
  _id,
  title,
  "slug": slug.current,
  category->{ _id, title },
  "mainImage": 問題画像{
    asset->{
      _id,
      url,
      metadata
    }
  },
  problemDescription
}`;

export const load = async () => {
  try {
    console.log('[+page.server.js] Fetching quizzes from Sanity...');
    const quizzes = await client.fetch(QUIZZES_QUERY);
    console.log('[+page.server.js] Fetched quizzes:', quizzes.length);
    console.log('[+page.server.js] First quiz data:', JSON.stringify(quizzes[0], null, 2));
    
    return {
      quizzes: quizzes || []
    };
  } catch (error) {
    console.error('[+page.server.js] Error fetching quizzes:', error);
    return {
      quizzes: []
    };
  }
};
