// src/routes/health/sanity/+server.js
import { json } from '@sveltejs/kit';
import { createClient } from '@sanity/client';
import { env } from '$env/dynamic/private'; // ← ここがポイント

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
  useCdn: !token,
  perspective: 'published'
});

export async function GET() {
  try {
    const doc = await sanity.fetch('*[0]{_id,_type}');
    return json({ ok: Boolean(doc) });
  } catch (e) {
    return json({ ok: false, error: String(e) }, { status: 500 });
  }
}
