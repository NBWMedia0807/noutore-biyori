import { json } from '@sveltejs/kit';
import { shouldSkipSanityFetch, sanityEnv } from '$lib/sanity.server.js';
import { createSlugContext, findQuizDocument, QUIZ_DIAGNOSTIC_QUERY } from '$lib/server/quiz.js';

export const prerender = false;
export const config = { runtime: 'nodejs18.x' };

export const GET = async ({ url }) => {
  const rawSlugParam = url.searchParams.get('slug');
  if (!rawSlugParam) {
    return json({ error: 'slug query parameter is required' }, { status: 400 });
  }

  const slugContext = createSlugContext(rawSlugParam);
  const { rawSlug, normalizedSlug, slugCandidates, primarySlug } = slugContext;
  const logPrefix = 'api/debug/sanity';

  console.info('[api/debug/sanity] IN', {
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
    console.warn('[api/debug/sanity] SKIP_SANITY active; cannot query Sanity');
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
    console.warn('[api/debug/sanity] 0件', { slugCandidates });
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
    console.info('[api/debug/sanity] resolved via catalog', { primarySlug, resolvedSlug });
  }

  console.info('[api/debug/sanity] OK', { slug: doc.slug, id: doc._id });

  return json({
    slug: rawSlug,
    normalizedSlug,
    resolvedSlug: resolvedSlug ?? doc.slug,
    hit: true,
    doc,
    env: sanityEnv
  });
};
