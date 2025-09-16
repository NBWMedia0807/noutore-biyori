import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity.server.js';

const QUERY = /* groq */ `
*[_type=='quiz' && slug.current==$slug && (
  (defined(category._ref) && category->slug.current==$category) ||
  (!defined(category._ref) && category==$category)
)][0]{
  title,
  "slug": slug.current,
  category->{ title, "slug": slug.current },
  answerImage{ asset->{ url, metadata } },
  answerExplanation,
  adCode1,
  adCode2,
  closingMessage
}`;

export const prerender = false;

export const load = async ({ params, setHeaders }) => {
  setHeaders({ 'cache-control': 'no-store' });
  const { category, slug } = params;
  const doc = await client.fetch(QUERY, { category, slug });
  if (!doc) throw error(404, 'Not found');
  return { quiz: doc, __dataSource: 'sanity' };
};

