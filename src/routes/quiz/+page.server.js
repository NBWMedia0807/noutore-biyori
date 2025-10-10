import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { createPageSeo } from '$lib/seo.js';
import {
  QUIZ_ORDER_BY_PUBLISHED,
  QUIZ_PUBLISHED_FILTER,
  filterVisibleQuizzes
} from '$lib/queries/quizVisibility.js';

export const prerender = false;
export const config = { runtime: 'nodejs22.x' };

const QUIZZES_QUERY = /* groq */ `
*[
  _type == "quiz"
  && defined(slug.current)
  ${QUIZ_PUBLISHED_FILTER}
] | order(${QUIZ_ORDER_BY_PUBLISHED}) {
  _id,
  title,
  "slug": slug.current,
  category->{ title, "slug": slug.current },
  mainImage{
    ...,
    asset->{ url, metadata }
  },
  problemImage{
    ...,
    asset->{ url, metadata }
  },
  problemDescription
}`;

const createQuizListSeo = (path) =>
  createPageSeo({
    title: 'クイズ一覧',
    description:
      '脳トレ日和で公開中のクイズ一覧です。マッチ棒クイズや間違い探しなど、バリエーション豊かな問題に挑戦できます。',
    path,
    breadcrumbs: [{ name: 'クイズ一覧', url: path }]
  });

export const load = async (event) => {
  const { url, setHeaders, isDataRequest } = event;

  if (!isDataRequest) {
    setHeaders({ 'cache-control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400' });
  }

  if (shouldSkipSanityFetch()) {
    return {
      quizzes: [],
      seo: createQuizListSeo(url.pathname)
    };
  }

  try {
    const result = await client.fetch(QUIZZES_QUERY);
    const quizzes = filterVisibleQuizzes(result);

    return { quizzes, seo: createQuizListSeo(url.pathname) };
  } catch (error) {
    console.error('[quiz/+page.server] Error fetching quizzes:', error);
    return {
      quizzes: [],
      seo: createQuizListSeo(url.pathname)
    };
  }
};
