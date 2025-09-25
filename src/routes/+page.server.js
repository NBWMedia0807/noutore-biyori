// src/routes/+page.server.js
import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { SITE } from '$lib/config/site.js';
import { createPageSeo } from '$lib/seo.js';

const QUIZZES_QUERY = /* groq */ `
*[_type == "quiz"] | order(_createdAt desc) {
  _id,
  title,
  "slug": slug.current,
  category->{ _id, title, "slug": slug.current },
  mainImage,
  // SSR用のサムネイルURL（asset参照がない場合の保険）
  "thumbnailUrl": mainImage.asset->url,
  problemDescription
}`;

const createTopPageSeo = (path) =>
  createPageSeo({
    title: `${SITE.name}｜${SITE.tagline}`,
    description: SITE.description,
    path,
    appendSiteName: false
  });

export const load = async (event) => {
  const { url, setHeaders, isDataRequest } = event;

  if (!isDataRequest) {
    setHeaders({ 'cache-control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400' });
  }

  if (shouldSkipSanityFetch()) {
    return {
      quizzes: [],
      seo: createTopPageSeo(url.pathname)
    };
  }

  try {
    const result = await client.fetch(QUIZZES_QUERY);
    const quizzes = Array.isArray(result) ? result.filter(Boolean) : [];

    return { quizzes, seo: createTopPageSeo(url.pathname) };
  } catch (error) {
    console.error('[+page.server.js] Error fetching quizzes:', error);
    return {
      quizzes: [],
      seo: createTopPageSeo(url.pathname)
    };
  }
};
