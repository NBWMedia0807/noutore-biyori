import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';

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

export const load = async () => {
  if (shouldSkipSanityFetch()) {
    return {
      categories: [],
      flags: {
        adsenseReviewMode: toBoolean(
          publicEnv.PUBLIC_ADSENSE_REVIEW_MODE ??
            publicEnv.ADSENSE_REVIEW_MODE ??
            privateEnv.ADSENSE_REVIEW_MODE
        )
      }
    };
  }

  try {
    const result = await client.fetch(CATEGORY_QUERY);
    const categories = Array.isArray(result) ? result.filter(Boolean) : [];
    return {
      categories,
      flags: {
        adsenseReviewMode: toBoolean(
          publicEnv.PUBLIC_ADSENSE_REVIEW_MODE ??
            publicEnv.ADSENSE_REVIEW_MODE ??
            privateEnv.ADSENSE_REVIEW_MODE
        )
      }
    };
  } catch (error) {
    console.error('[+layout.server] Error fetching categories:', error);
    return {
      categories: [],
      flags: {
        adsenseReviewMode: toBoolean(
          publicEnv.PUBLIC_ADSENSE_REVIEW_MODE ??
            publicEnv.ADSENSE_REVIEW_MODE ??
            privateEnv.ADSENSE_REVIEW_MODE
        )
      }
    };
  }
};
