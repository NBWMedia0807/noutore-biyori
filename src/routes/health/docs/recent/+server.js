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
    '*[defined(slug.current)]{_id,_type,title,"slug":slug.current,_updatedAt} | order(_updatedAt desc)[0...20]'
  );
  return json({ count: docs.length, docs });
}
