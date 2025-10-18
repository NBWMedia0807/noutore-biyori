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

// グローバルナビでは「間違い探し」を常に先頭に配置したい。
// Sanityから取得したカテゴリをソートする際に、特定スラッグの優先度を調整する。
const normalizeSlugKey = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
};

const normalizeTitleKey = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, '');
};

const CATEGORY_PRIORITY_SLUGS = new Map([
  ['spothedifference', 0],
  ['machigaisagashi', 0],
  ['machigaisagashiquiz', 0],
  ['machigaisagasi', 0]
]);

const CATEGORY_PRIORITY_TITLES = new Map([
  ['間違い探し', 0],
  ['間違いさがし', 0],
  ['まちがい探し', 0],
  ['まちがいさがし', 0]
]);

const resolveSlugPriority = (slug) => {
  const normalized = normalizeSlugKey(slug);
  if (!normalized) return null;
  return CATEGORY_PRIORITY_SLUGS.has(normalized)
    ? CATEGORY_PRIORITY_SLUGS.get(normalized)
    : null;
};

const resolveTitlePriority = (title) => {
  const normalized = normalizeTitleKey(title);
  if (!normalized) return null;
  return CATEGORY_PRIORITY_TITLES.has(normalized)
    ? CATEGORY_PRIORITY_TITLES.get(normalized)
    : null;
};

const getCategoryPriority = (category) => {
  if (!category) return Number.MAX_SAFE_INTEGER;
  const slugPriority = resolveSlugPriority(category.slug);
  if (slugPriority !== null) {
    return slugPriority;
  }
  const titlePriority = resolveTitlePriority(category.title);
  if (titlePriority !== null) {
    return titlePriority;
  }
  return Number.MAX_SAFE_INTEGER;
};

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

  return sanitized.sort((a, b) => {
    const priorityDiff = getCategoryPriority(a) - getCategoryPriority(b);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return a.title.localeCompare(b.title, 'ja');
  });
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

    let resolvedCategories = categories;
    if (fallbackCategories.length > 0) {
      const existingSlugs = new Set(categories.map((category) => category.slug));
      const additionalCategories = fallbackCategories.filter(
        (category) => !existingSlugs.has(category.slug)
      );
      if (additionalCategories.length > 0) {
        resolvedCategories = sanitizeCategories([...categories, ...additionalCategories]);
      }
    }

    if (resolvedCategories.length === 0) {
      resolvedCategories = fallbackCategories;
    }

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
