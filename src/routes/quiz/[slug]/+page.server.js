// 最小構成。Sanityから1件取得して doc で返す
import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity.js';

const QUERY = /* groq */ `
*[_type == "quiz" && (slug.current == $slug || _id == $slug)][0]{
  _id,
  title,
  "slug": slug.current,
  mainImage{asset->{url}},
  body
}
`;

export const load = async ({ params }) => {
  const slug = params.slug;
  console.log('[quiz/[slug]] incoming slug:', slug);

  const doc = await client.fetch(QUERY, { slug });
  console.log('[quiz/[slug]] fetched?', Boolean(doc));

  if (!doc) throw error(404, 'Not found');
  return { doc };
};
