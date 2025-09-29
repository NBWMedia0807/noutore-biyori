import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';

export const prerender = false;
export const config = { runtime: 'node' };

const CATEGORY_QUERY = /* groq */ `
*[_type == "category" && defined(slug.current) && !(_id in path("drafts.**"))] | order(title asc) {
  title,
  "slug": slug.current
}`;

export const load = async () => {
  if (shouldSkipSanityFetch()) {
    return { categories: [] };
  }

  try {
    const result = await client.fetch(CATEGORY_QUERY);
    const categories = Array.isArray(result) ? result.filter(Boolean) : [];
    return { categories };
  } catch (error) {
    console.error('[+layout.server] Error fetching categories:', error);
    return { categories: [] };
  }
};
