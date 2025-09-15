import { client } from '$lib/sanity.server.js';

const CATEGORY_QUERY = /* groq */ `
*[_type == "category" && defined(slug.current)] | order(title asc) {
  title,
  "slug": slug.current
}`;

export const load = async ({ setHeaders }) => {
  setHeaders({ 'cache-control': 'no-store' });
  let categories = [];
  try {
    categories = await client.fetch(CATEGORY_QUERY);
  } catch (e) {
    categories = [];
  }
  return { categories };
};

