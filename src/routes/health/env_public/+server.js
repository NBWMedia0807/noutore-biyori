import { json } from '@sveltejs/kit';
import { env as pub } from '$env/dynamic/public';

export function GET() {
  return json({
    VITE_SANITY_PROJECT_ID: pub.VITE_SANITY_PROJECT_ID ?? null,
    VITE_SANITY_DATASET: pub.VITE_SANITY_DATASET ?? null,
    VITE_SANITY_API_VERSION: pub.VITE_SANITY_API_VERSION ?? null
  });
}

