import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private'; // ← ランタイムに .env を読む

export function GET() {
  return json({
    projectId: env.SANITY_PROJECT_ID ?? null,
    dataset: env.SANITY_DATASET ?? null,
    apiVersion: env.SANITY_API_VERSION ?? null,
    tokenTail: (() => {
      const token = env.SANITY_READ_TOKEN || env.SANITY_WRITE_TOKEN || env.SANITY_AUTH_TOKEN;
      return token ? token.slice(-4) : null;
    })()
  });
}
