import { redirect, error } from '@sveltejs/kit';
import { createSlugContext, findQuizDocument } from '$lib/server/quiz.js';

export const prerender = false;
export const config = { runtime: 'nodejs22.x' };

const REDIRECT_QUERY = /* groq */ `*[_type == "quiz" && slug.current == $slug && !(_id in path("drafts.**"))][0]{
  _id,
  "slug": slug.current,
  category->{ "slug": slug.current }
}`;

const resolveCategorySlug = (slug) => (slug === 'spot-the-difference' ? 'spot-the-difference' : 'matchstick');

export async function load({ params }) {
  const slugContext = createSlugContext(params.slug ?? '');
  const { doc } = await findQuizDocument({
    slugContext,
    query: REDIRECT_QUERY,
    logPrefix: 'quiz/[slug]/answer/redirect'
  });

  if (!doc) {
    throw error(404, `Quiz not found: ${slugContext?.primarySlug ?? ''}`);
  }

  const categorySlug = resolveCategorySlug(doc?.category?.slug);
  throw redirect(308, `/quiz/${categorySlug}/article/${doc._id}/answer`);
}
