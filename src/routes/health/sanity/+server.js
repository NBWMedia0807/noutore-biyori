// src/routes/health/sanity/+server.js
import { json } from '@sveltejs/kit';
import { createClient } from '@sanity/client';
import { env } from '$env/dynamic/private'; // ← ここがポイント

const sanity = createClient({
  projectId: env.SANITY_PROJECT_ID,
  dataset: env.SANITY_DATASET || 'production',
  apiVersion: process.env.SANITY_API_VERSION || '2024-01-01',
  token:
    env.SANITY_READ_TOKEN ||
    env.SANITY_WRITE_TOKEN ||
    env.SANITY_AUTH_TOKEN ||
    env.SANITY_DEPLOY_TOKEN ||
    env.SANITY_API_TOKEN,
  useCdn: false,
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
