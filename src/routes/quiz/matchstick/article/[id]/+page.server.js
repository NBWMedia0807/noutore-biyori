// src/routes/quiz/matchstick/article/[id]/+page.server.js
export const prerender = false;

import { client } from '$lib/sanity.server.js';
import { error } from '@sveltejs/kit';

const Q = /* groq */ `
*[_type == "quiz" && _id == $id][0]{
  _id,
  title,
  "slug": slug.current,
  category->{ _id, title },
  problemDescription,
  hint,
  adCode1,
  mainImage{ asset->{ url, metadata } },
  answerImage{ asset->{ url, metadata } },
  answerExplanation,
  adCode2,
  closingMessage,
  _createdAt
}`;

export const load = async ({ params }) => {
  const id = params.id;
  const quiz = await client.fetch(Q, { id });
  if (!quiz) throw error(404, 'Not found');
  return { quiz };
};

