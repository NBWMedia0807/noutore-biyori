import { json } from '@sveltejs/kit';
import { shouldSkipSanityFetch, sanityEnv } from '$lib/sanity.server.js';
import { fetchQuizCatalog } from '$lib/server/quiz.js';
import { vercelNodeConfig } from '$lib/server/runtime.js';

export const prerender = false;
export const config = vercelNodeConfig;

export const GET = async () => {
  if (shouldSkipSanityFetch()) {
    console.warn('[health/quiz/slugs] SKIP_SANITY active; cannot query Sanity');
    return json(
      {
        count: 0,
        slugs: [],
        sample: [],
        hit: false,
        reason: 'SKIP_SANITY',
        env: sanityEnv
      },
      { status: 503 }
    );
  }

  const catalog = await fetchQuizCatalog('health/quiz/slugs');
  console.info('[health/quiz/slugs] OK', { count: catalog.length });

  return json({
    count: catalog.length,
    slugs: catalog.map((entry) => entry.slug),
    sample: catalog.slice(0, 3),
    env: sanityEnv
  });
};
