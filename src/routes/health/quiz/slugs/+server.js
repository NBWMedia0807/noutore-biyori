import { json } from '@sveltejs/kit';
import { createClient } from '@sanity/client';
import { env } from '$env/dynamic/private';

const projectId = env.SANITY_PROJECT_ID || 'quljge22';
const dataset = env.SANITY_DATASET || 'production';
const apiVersion = env.SANITY_API_VERSION || '2024-01-01';
const tokenCandidates = [
  env.SANITY_READ_TOKEN,
  env.SANITY_WRITE_TOKEN,
  env.SANITY_AUTH_TOKEN,
  env.SANITY_DEPLOY_TOKEN,
  env.SANITY_API_TOKEN
];
const token = tokenCandidates.find((value) => typeof value === 'string' && value.trim().length > 0);

const sanity = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn: !token
});

export async function GET() {
  const docs = await sanity.fetch(
    '*[_type=="quiz"]{_id,"slug":slug.current,_updatedAt} | order(_updatedAt desc)[0...50]'
  );
  return json({ count: docs.length, slugs: docs.map(d => d.slug), sample: docs.slice(0,3) });
}
