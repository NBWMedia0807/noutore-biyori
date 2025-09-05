// /src/routes/quiz/+page.server.js
import { client } from '$lib/sanity.js';

export const prerender = false;

const QUERY = /* groq */ `
*[_type == "quiz"] | order(_updatedAt desc)[0..20]{
  _id,
  title,
  "slug": slug.current,
  mainImage{
    asset->{ url, metadata }
  }
}
`;

export const load = async () => {
  try {
    const quizzes = await client.fetch(QUERY);
    console.log(`[quiz/+page.server] quizzes: ${quizzes?.length ?? 0}`);
    return { quizzes };
  } catch (e) {
    console.error('[quiz/+page.server] fetch failed', e);
    return { quizzes: [] };
  }
};
