import { json } from '@sveltejs/kit';
import { createClient } from '@sanity/client';
import { env } from '$env/dynamic/private';

const sanity = createClient({
  projectId: env.SANITY_PROJECT_ID,
  dataset: env.SANITY_DATASET || 'production',
  apiVersion: process.env.SANITY_API_VERSION || '2024-01-01',
  token: env.SANITY_READ_TOKEN || env.SANITY_WRITE_TOKEN || env.SANITY_AUTH_TOKEN,
  useCdn: false
});

export async function GET({ params }) {
  const doc = await sanity.fetch(
    '*[_type=="quiz" && slug.current==$slug][0]{_id,title,"slug":slug.current}',
    { slug: params.slug }
  );
  return json({ found: Boolean(doc), doc });
}
