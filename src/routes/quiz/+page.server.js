// src/routes/quiz/+page.server.js
import { client } from '$lib/sanity.js';

const QUERY = `
*[_type=="quiz" && defined(slug.current)]{
  title,
  "slug": slug.current,
  mainImage,
  _updatedAt
} | order(_updatedAt desc)[0..50]
`;

export async function load() {
  const quizzes = await client.fetch(QUERY);
  return { quizzes };
}
