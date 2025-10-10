// src/routes/+page.server.js
import { env } from '$env/dynamic/private';
import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { SITE } from '$lib/config/site.js';
import { createPageSeo } from '$lib/seo.js';
import { QUIZ_PREVIEW_PROJECTION } from '$lib/queries/quizPreview.js';
import {
  QUIZ_ORDER_BY_PUBLISHED,
  QUIZ_PUBLISHED_FILTER,
  filterVisibleQuizzes
} from '$lib/queries/quizVisibility.js';

export const prerender = false;
const homeBypassToken = env.VERCEL_REVALIDATE_TOKEN || env.SANITY_REVALIDATE_SECRET;
const homeIsrConfig = { expiration: false };
if (homeBypassToken) {
  homeIsrConfig.bypassToken = homeBypassToken;
}

export const config = { runtime: 'nodejs22.x', isr: homeIsrConfig };

const QUIZZES_QUERY = /* groq */ `
*[
  _type == "quiz"
  && defined(slug.current)
  ${QUIZ_PUBLISHED_FILTER}
] | order(${QUIZ_ORDER_BY_PUBLISHED}) {
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
    const quizzes = filterVisibleQuizzes(result);

    return { quizzes, seo: createTopPageSeo(url.pathname) };
  } catch (error) {
    console.error('[+page.server.js] Error fetching quizzes:', error);
    return {
      quizzes: [],
      seo: createTopPageSeo(url.pathname)
    };
  }
};
