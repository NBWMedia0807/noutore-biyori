// src/routes/quiz/[slug]/answer/+page.server.js
export const prerender = false;

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
  mainImage{ asset->{ url, metadata } },
  answerImage{ asset->{ url, metadata } },
  answerExplanation,
  closingMessage
}
`;

export const load = async ({ params }) => {
  const slug = params.slug;
  try {
    const quiz = await client.fetch(QUERY, { slug });
    if (!quiz) throw error(404, 'Not found');
    return { quiz };
  } catch (e) {
    if (isHttpError(e)) throw e;
    throw error(500, 'Failed to load answer');
  }
};

