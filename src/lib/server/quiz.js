import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { createSlugQueryPayload } from '$lib/utils/slug.js';
import {
  isQuizStubEnabled,
  getQuizStubCatalog,
  getQuizStubDocument,
  resolveQuizStubSlug
} from '$lib/server/quiz-stub.js';
import {
  QUIZ_ORDER_BY_PUBLISHED,
  QUIZ_PUBLISHED_FILTER,
  filterVisibleQuizzes,
  isFutureScheduled,
  shouldRestrictToPublishedContent
} from '$lib/queries/quizVisibility.js';

const formatPrefix = (prefix) => (prefix ? `[${prefix}]` : '[quiz]');
const hasStructuredClone = typeof globalThis.structuredClone === 'function';
const clone = (value) => (hasStructuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

const uniqueStrings = (values) => {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
};

export const QUIZ_SLUGS_QUERY = /* groq */ `
*[
  _type == "quiz"
  && defined(slug.current)
  ${QUIZ_PUBLISHED_FILTER}
] | order(${QUIZ_ORDER_BY_PUBLISHED}){
  _id,
  "slug": slug.current,
  publishedAt,
  _createdAt,
  _updatedAt
}`;

export const createSlugContext = (rawSlug) => {
  const original = typeof rawSlug === 'string' ? rawSlug : '';
  let decoded = original;
  try {
    decoded = decodeURIComponent(original);
  } catch (err) {
    decoded = original;
  }
  const normalizedSlug = decoded.trim();
  const { candidates, lowerCandidates } = createSlugQueryPayload(normalizedSlug);

  const slugCandidates = uniqueStrings([original, normalizedSlug, ...candidates]);
  const lowerNormalized = typeof normalizedSlug === 'string' ? normalizedSlug.toLowerCase() : '';
  const lowerOriginal = typeof original === 'string' ? original.toLowerCase() : '';
  const lowerSlugCandidates = uniqueStrings([lowerNormalized, lowerOriginal, ...lowerCandidates]);

  return {
    rawSlug: original,
    normalizedSlug,
    slugCandidates,
    lowerSlugCandidates,
    primarySlug: slugCandidates[0] ?? ''
  };
};

export const fetchQuizCatalog = async (logPrefix = 'quiz catalog') => {
  let catalog = [];
  const skipSanity = shouldSkipSanityFetch();

  if (!skipSanity) {
    try {
      const result = await client.fetch(QUIZ_SLUGS_QUERY);
      if (Array.isArray(result)) {
        catalog = filterVisibleQuizzes(result);
      }
    } catch (error) {
      console.error(`${formatPrefix(logPrefix)} Failed to fetch quiz catalog`, error);
    }
  } else {
    console.info(`${formatPrefix(logPrefix)} SKIP_SANITY active; using stub catalog only`);
  }

  if (isQuizStubEnabled()) {
    const existingSlugs = new Set(catalog.map((entry) => entry.slug));
    for (const stub of getQuizStubCatalog()) {
      if (!stub?.slug || existingSlugs.has(stub.slug)) continue;
      existingSlugs.add(stub.slug);
      catalog.push(clone(stub));
    }
  }

  return catalog;
};

export const fetchQuizDocument = async ({ query, slug, logPrefix }) => {
  if (!slug) return null;
  const skipSanity = shouldSkipSanityFetch();

  if (!skipSanity) {
    try {
      const doc = await client.fetch(query, { slug });
      if (doc) {
        if (
          shouldRestrictToPublishedContent &&
          doc.publishedAt &&
          isFutureScheduled(doc.publishedAt)
        ) {
          console.info(
            `${formatPrefix(logPrefix)} Ignoring future publish date for slug:${slug} (${doc.publishedAt})`
          );
          return null;
        }
        return doc;
      }
    } catch (error) {
      console.error(`${formatPrefix(logPrefix)} Failed to fetch quiz by slug:${slug}`, error);
    }
  } else {
    console.info(`${formatPrefix(logPrefix)} SKIP_SANITY active; skipping Sanity fetch for slug:${slug}`);
  }

  if (isQuizStubEnabled()) {
    const stubDoc = getQuizStubDocument(slug);
    if (stubDoc) {
      console.info(`${formatPrefix(logPrefix)} Using stub quiz document for slug:${slug}`);
      return clone(stubDoc);
    }
  }

  return null;
};

export const resolveQuizSlug = async ({
  slugCandidates,
  lowerSlugCandidates,
  logPrefix,
  catalog
}) => {
  try {
    const catalogData = Array.isArray(catalog) ? catalog : await fetchQuizCatalog(logPrefix);
    if (!Array.isArray(catalogData) || catalogData.length === 0) {
      return { resolvedSlug: null, catalog: catalogData ?? [] };
    }

    const slugCandidateSet = new Set(slugCandidates);
    const lowerCandidateSet = new Set(lowerSlugCandidates);

    for (const entry of catalogData) {
      const candidateSlug = entry?.slug;
      const candidateId = entry?._id;
      if (candidateId && slugCandidateSet.has(candidateId)) {
        return { resolvedSlug: candidateSlug ?? null, catalog: catalogData };
      }

      if (typeof candidateSlug !== 'string' || candidateSlug.length === 0) continue;

      const { candidates: entryCandidates, lowerCandidates: entryLowerCandidates } =
        createSlugQueryPayload(candidateSlug);

      const hasDirectOverlap = entryCandidates.some((value) => slugCandidateSet.has(value));
      const hasLowerOverlap = entryLowerCandidates.some((value) => lowerCandidateSet.has(value));

      if (hasDirectOverlap || hasLowerOverlap) {
        return { resolvedSlug: candidateSlug, catalog: catalogData };
      }
    }

    if (isQuizStubEnabled()) {
      const stubSlug = resolveQuizStubSlug(slugCandidates, lowerSlugCandidates);
      if (stubSlug) {
        return { resolvedSlug: stubSlug, catalog: catalogData };
      }
    }

    return { resolvedSlug: null, catalog: catalogData };
  } catch (error) {
    console.error(`${formatPrefix(logPrefix)} Failed to resolve slug from catalog`, error);
    return { resolvedSlug: null, catalog: [] };
  }
};

export const findQuizDocument = async ({ slugContext, query, logPrefix }) => {
  if (!slugContext) {
    return { doc: null, resolvedSlug: null };
  }

  const { primarySlug, slugCandidates, lowerSlugCandidates } = slugContext;
  if (!primarySlug) {
    return { doc: null, resolvedSlug: null };
  }

  let resolvedSlug = primarySlug;
  let doc = await fetchQuizDocument({ query, slug: primarySlug, logPrefix });

  if (!doc) {
    const { resolvedSlug: fallbackSlug } = await resolveQuizSlug({
      slugCandidates,
      lowerSlugCandidates,
      logPrefix
    });

    if (fallbackSlug && fallbackSlug !== primarySlug) {
      const fallbackDoc = await fetchQuizDocument({ query, slug: fallbackSlug, logPrefix });
      if (fallbackDoc) {
        resolvedSlug = fallbackSlug;
        doc = fallbackDoc;
      }
    }
  }

  return { doc, resolvedSlug: doc ? resolvedSlug : null };
};
