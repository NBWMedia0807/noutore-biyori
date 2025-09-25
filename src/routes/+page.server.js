// src/routes/+page.server.js
import { client } from '$lib/sanity.server.js';
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

export const load = async ({ url }) => {
  try {
    const result = await client.fetch(QUIZZES_QUERY);
    const quizzes = Array.isArray(result) ? result.filter(Boolean) : [];

    const seo = createPageSeo({
      title: `${SITE.name}｜${SITE.tagline}`,
      description: SITE.description,
      path: url.pathname,
      appendSiteName: false
    });

    return { quizzes, seo };
  } catch (error) {
    console.error('[+page.server.js] Error fetching quizzes:', error);
    return {
      quizzes: [],
      seo: createPageSeo({
        title: `${SITE.name}｜${SITE.tagline}`,
        description: SITE.description,
        path: url.pathname,
        appendSiteName: false
      })
    };
  }
};
