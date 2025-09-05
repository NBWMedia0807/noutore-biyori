// src/routes/quiz/[slug]/+page.server.js
import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity.js';

export const prerender = false;
export const csr = true;

// slug.current と _id のどちらでもヒットするように
const QUERY = /* groq */ `
*[
  _type == "quiz" &&
  (
    slug.current == $slug ||
    _id == $slug
  )
][0]{
  _id,
  title,
  "slug": coalesce(slug.current, _id),
  "mainImageUrl": mainImage.asset->url,
  body
}
`;

export async function load({ params }) {
  try {
    const quiz = await client.fetch(QUERY, { slug: params.slug });
    console.log('[quiz/[slug]/+page.server] slug:', params.slug, 'found:', !!quiz);
    if (!quiz) {
      throw error(404, 'Not found');
    }
    return { quiz };
  } catch (err) {
    console.error('[quiz/[slug]/+page.server] failed:', err);
    throw error(500, 'Failed to load');
  }
}
