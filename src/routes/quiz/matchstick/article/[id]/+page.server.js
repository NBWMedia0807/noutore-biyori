import { redirect, error } from '@sveltejs/kit';
import { client } from '$lib/sanity.server.js';
import { QUIZ_PUBLISHED_FILTER } from '$lib/queries/quizVisibility.js';

export const prerender = false;
export const ssr = true;

const Q = /* groq */ `*[_type == "quiz" && _id == $id${QUIZ_PUBLISHED_FILTER}][0]{ "slug": slug.current }`;

export async function load({ params }) {
  const { id } = params;
  const hit = await client.fetch(Q, { id });
  if (!hit?.slug) throw error(404, 'Quiz not found');
  throw redirect(308, `/quiz/${hit.slug}`);
}
