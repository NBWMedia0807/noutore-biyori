import { json } from '@sveltejs/kit';
import { createClient } from '@sanity/client';
import { env } from '$env/dynamic/private';

const sanity = createClient({
  projectId: env.SANITY_PROJECT_ID,
  dataset: env.SANITY_DATASET || 'production',
  apiVersion: env.SANITY_API_VERSION || '2023-10-01',
  token: env.SANITY_READ_TOKEN,
  useCdn: false
});

const QUERY = `
*[_type == "quiz" && (slug.current == $slug || _id == $slug)][0]{
  _id,
  title,
  "slug": slug.current,
  body,
  mainImage{ asset->{ url, metadata } }
}
`;

export async function GET({ params }) {
  const doc = await sanity.fetch(QUERY, { slug: params.slug });
  return json({ found: Boolean(doc), doc });
}
