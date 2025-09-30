import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { createPageSeo } from '$lib/seo.js';

export const prerender = false;
export const config = { runtime: 'nodejs22.x' };

const QUIZZES_QUERY = /* groq */ `
*[_type == "quiz" && defined(slug.current) && !(_id in path("drafts.**"))] | order(_createdAt desc) {
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
    const quizzes = Array.isArray(result)
      ? result.filter((quiz) => quiz && typeof quiz.slug === 'string' && quiz.slug.length > 0)
      : [];

    return { quizzes, seo: createQuizListSeo(url.pathname) };
  } catch (error) {
    console.error('[quiz/+page.server] Error fetching quizzes:', error);
    return {
      quizzes: [],
      seo: createQuizListSeo(url.pathname)
    };
  }
};
