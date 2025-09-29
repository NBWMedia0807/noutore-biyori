import { json } from '@sveltejs/kit';
import { client, shouldSkipSanityFetch, sanityEnv } from '$lib/sanity.server.js';
import { createSlugQueryPayload } from '$lib/utils/slug.js';

export const prerender = false;
export const config = { runtime: 'node' };

const QUIZ_SLUGS_QUERY = /* groq */ `
*[_type == "quiz" && defined(slug.current) && !(_id in path("drafts.**"))]{
  _id,
  "slug": slug.current
}`;

const QUIZ_BY_SLUG_QUERY = /* groq */ `
*[_type == "quiz" && slug.current == $slug && !(_id in path("drafts.**"))][0]{
  _id,
  title,
  "slug": slug.current,
  _createdAt,
  _updatedAt
}`;

const fetchQuizBySlug = async (slug) => {
  if (!slug) return null;
  try {
    return await client.fetch(QUIZ_BY_SLUG_QUERY, { slug });
  } catch (err) {
    console.error(`[health/quiz] Failed to fetch quiz by slug:${slug}`, err);
    return null;
  }
};

const resolveSlugFromCatalog = async (slugCandidates, lowerSlugCandidates) => {
  try {
    const catalog = await client.fetch(QUIZ_SLUGS_QUERY);
    if (!Array.isArray(catalog) || catalog.length === 0) {
      return null;
    }

    const slugCandidateSet = new Set(slugCandidates);
    const lowerCandidateSet = new Set(lowerSlugCandidates);

    for (const entry of catalog) {
      const candidateSlug = entry?.slug;
      const candidateId = entry?._id;
      if (candidateId && slugCandidateSet.has(candidateId)) {
        return candidateSlug ?? null;
      }

      if (typeof candidateSlug !== 'string' || candidateSlug.length === 0) continue;

      const { candidates: entryCandidates, lowerCandidates: entryLowerCandidates } =
        createSlugQueryPayload(candidateSlug);
      const hasDirectOverlap = entryCandidates.some((value) => slugCandidateSet.has(value));
      const hasLowerOverlap = entryLowerCandidates.some((value) => lowerCandidateSet.has(value));
      if (hasDirectOverlap || hasLowerOverlap) {
        return candidateSlug;
      }
    }
  } catch (fallbackError) {
    console.error('[health/quiz] Failed to resolve slug from catalog', fallbackError);
  }

  return null;
};

export const GET = async ({ params }) => {
  const rawSlug = params.slug ?? '';
  const normalizedSlug = decodeURIComponent(rawSlug ?? '');
  const { candidates: slugCandidates, lowerCandidates: lowerSlugCandidates } =
    createSlugQueryPayload(normalizedSlug);
  const primarySlug = slugCandidates[0] ?? '';

  console.info('[health/quiz/[slug]] IN', { slug: rawSlug, normalizedSlug, env: sanityEnv });

  if (!slugCandidates.length) {
    return json({
      slug: rawSlug,
      normalizedSlug,
      resolvedSlug: null,
      hit: false,
      reason: 'NO_CANDIDATE'
    }, { status: 400 });
  }

  if (shouldSkipSanityFetch()) {
    console.warn('[health/quiz/[slug]] SKIP_SANITY active; cannot query Sanity');
    return json({
      slug: rawSlug,
      normalizedSlug,
      resolvedSlug: null,
      hit: false,
      reason: 'SKIP_SANITY'
    }, { status: 503 });
  }

  let resolvedSlug = primarySlug;
  let doc = await fetchQuizBySlug(primarySlug);

  if (!doc) {
    resolvedSlug = await resolveSlugFromCatalog(slugCandidates, lowerSlugCandidates);
    if (resolvedSlug && resolvedSlug !== primarySlug) {
      doc = await fetchQuizBySlug(resolvedSlug);
    }
  }

  if (!doc) {
    console.warn('[health/quiz/[slug]] 0件', { slugCandidates });
    return json({
      slug: rawSlug,
      normalizedSlug,
      resolvedSlug,
      hit: false
    }, { status: 404 });
  }

  console.info('[health/quiz/[slug]] OK', { slug: doc.slug, id: doc._id });

  return json({
    slug: rawSlug,
    normalizedSlug,
    resolvedSlug: doc.slug,
    hit: true,
    doc,
    env: sanityEnv
  });
};
