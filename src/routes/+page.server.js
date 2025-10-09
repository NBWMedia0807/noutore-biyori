// src/routes/+page.server.js
import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { SITE } from '$lib/config/site.js';
import { createPageSeo } from '$lib/seo.js';
import { QUIZ_PREVIEW_PROJECTION } from '$lib/queries/quizPreview.js';

export const prerender = false;
export const config = { runtime: 'nodejs22.x' };

const QUIZZES_QUERY = /* groq */ `
*[
  _type == "quiz"
  && defined(slug.current)
  && !(_id in path("drafts.**"))
  && (!defined(publishedAt) || publishedAt <= now())
] | order(coalesce(publishedAt, _createdAt) desc) {
  ${QUIZ_PREVIEW_PROJECTION}
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
    const quizzes = Array.isArray(result)
      ? result.filter((quiz) => {
          if (!quiz) return false;
          if (typeof quiz.slug !== 'string' || quiz.slug.length === 0) return false;
          if (quiz.publishedAt && new Date(quiz.publishedAt).getTime() > Date.now()) {
            return false;
          }
          return true;
        })
      : [];

    return { quizzes, seo: createTopPageSeo(url.pathname) };
  } catch (error) {
    console.error('[+page.server.js] Error fetching quizzes:', error);
    return {
      quizzes: [],
      seo: createTopPageSeo(url.pathname)
    };
  }
};
