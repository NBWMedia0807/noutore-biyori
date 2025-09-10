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

export async function GET() {
  const docs = await sanity.fetch(
    '*[_type=="quiz"]{_id, "slug": slug.current, _updatedAt} | order(_updatedAt desc)[0...50]'
  );
  return json({
    count: docs.length,
    slugs: docs.map(d => d.slug),
    sample: docs.slice(0, 3)
  });
}
