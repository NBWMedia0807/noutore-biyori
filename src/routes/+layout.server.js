import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { isQuizStubEnabled, getQuizStubCategories } from '$lib/server/quiz-stub.js';

export const prerender = false;
export const config = { runtime: 'nodejs22.x' };

const CATEGORY_QUERY = /* groq */ `
*[_type == "category" && defined(slug.current) && !(_id in path("drafts.**"))] | order(title asc) {
  title,
  "slug": slug.current
}`;

const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (value === null || value === undefined) return false;
  const normalized = value.toString().trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
};

const resolveFlags = () => ({
  adsenseReviewMode: toBoolean(
    publicEnv.PUBLIC_ADSENSE_REVIEW_MODE ??
      publicEnv.ADSENSE_REVIEW_MODE ??
      privateEnv.ADSENSE_REVIEW_MODE
  )
});

const sanitizeCategories = (entries) => {
  if (!Array.isArray(entries)) return [];
  const seen = new Set();
  const sanitized = [];

  for (const entry of entries) {
    const slug = typeof entry?.slug === 'string' ? entry.slug.trim() : '';
    const title = typeof entry?.title === 'string' ? entry.title.trim() : '';
    if (!slug || !title || seen.has(slug)) continue;
    seen.add(slug);
    sanitized.push({ slug, title });
  }

  return sanitized.sort((a, b) => a.title.localeCompare(b.title, 'ja'));
};

const getFallbackCategories = () => {
  const skipSanity = shouldSkipSanityFetch();
  if (!isQuizStubEnabled() && !skipSanity) return [];
  try {
    return sanitizeCategories(getQuizStubCategories());
  } catch (error) {
    console.error('[+layout.server] Failed to resolve stub categories:', error);
    return [];
  }
};

export const load = async () => {
  const fallbackCategories = getFallbackCategories();

  if (shouldSkipSanityFetch()) {
    const categories = fallbackCategories;
    return {
      categories,
      flags: resolveFlags()
    };
  }

  try {
    const result = await client.fetch(CATEGORY_QUERY);
    const categories = sanitizeCategories(result);
    const resolvedCategories =
      categories.length > 0 ? categories : fallbackCategories;

    if (categories.length === 0 && fallbackCategories.length > 0) {
      console.info('[+layout.server] Falling back to stub categories for global navigation');
    }

    return {
      categories: resolvedCategories,
      flags: resolveFlags()
    };
  } catch (error) {
    console.error('[+layout.server] Error fetching categories:', error);
    return {
      categories: fallbackCategories,
      flags: resolveFlags()
    };
  }
};
