import { json } from '@sveltejs/kit';
import { shouldSkipSanityFetch, sanityEnv } from '$lib/sanity.server.js';
import { createSlugContext, findQuizDocument, QUIZ_DIAGNOSTIC_QUERY } from '$lib/server/quiz.js';

export const prerender = false;
export const config = { runtime: 'nodejs18.x' };

export const GET = async ({ params }) => {
  const slugContext = createSlugContext(params.slug ?? '');
  const { rawSlug, normalizedSlug, slugCandidates, primarySlug } = slugContext;
  const logPrefix = 'health/quiz/[slug]';

  console.info('[health/quiz/[slug]] IN', {
    slug: rawSlug,
    normalizedSlug,
    env: sanityEnv
  });

  if (!slugCandidates.length) {
    return json(
      {
        slug: rawSlug,
        normalizedSlug,
        resolvedSlug: null,
        hit: false,
        reason: 'NO_CANDIDATE'
      },
      { status: 400 }
    );
  }

  if (shouldSkipSanityFetch()) {
    console.warn('[health/quiz/[slug]] SKIP_SANITY active; cannot query Sanity');
    return json(
      {
        slug: rawSlug,
        normalizedSlug,
        resolvedSlug: null,
        hit: false,
        reason: 'SKIP_SANITY'
      },
      { status: 503 }
    );
  }

  const { doc, resolvedSlug } = await findQuizDocument({
    slugContext,
    query: QUIZ_DIAGNOSTIC_QUERY,
    logPrefix
  });

  if (!doc) {
    console.warn('[health/quiz/[slug]] 0件', { slugCandidates });
    return json(
      {
        slug: rawSlug,
        normalizedSlug,
        resolvedSlug: resolvedSlug ?? null,
        hit: false
      },
      { status: 404 }
    );
  }

  if (resolvedSlug && resolvedSlug !== primarySlug) {
    console.info('[health/quiz/[slug]] resolved via catalog', { primarySlug, resolvedSlug });
  }

  console.info('[health/quiz/[slug]] OK', { slug: doc.slug, id: doc._id });

  return json({
    slug: rawSlug,
    normalizedSlug,
    resolvedSlug: resolvedSlug ?? doc.slug,
    hit: true,
    doc,
    env: sanityEnv
  });
};
