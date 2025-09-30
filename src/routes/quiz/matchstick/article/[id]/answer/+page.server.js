import { error } from '@sveltejs/kit';
import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { QUIZ_ANSWER_BY_ID_QUERY } from '$lib/server/quiz.js';

export const prerender = false;
export const config = { runtime: 'nodejs22.x' };

const resolveCategorySlug = (slug) => (slug === 'spot-the-difference' ? 'spot-the-difference' : 'matchstick');

const buildFallback = (id, pathname) => {
  const fallbackTitle = 'クイズ記事';
  const articlePath = `/quiz/matchstick/article/${id}`;
  const breadcrumbs = [
    { name: 'クイズ一覧', url: '/quiz' },
    { name: fallbackTitle, url: articlePath },
    { name: '正解', url: '' }
  ];

  return {
    quiz: {
      _id: id,
      title: fallbackTitle,
      slug: '',
      category: null,
      answerImage: null,
      answerExplanation: ''
    },
    breadcrumbs,
    __dataSource: 'fallback',
    __pathname: pathname
  };
};

export async function load(event) {
  const { params, url, setHeaders, isDataRequest } = event;
  const id = params.id ?? '';

  if (!id) {
    throw error(404, 'Answer not found');
  }

  if (!isDataRequest) {
    setHeaders({ 'cache-control': 'public, max-age=60, s-maxage=300' });
  }

  if (shouldSkipSanityFetch()) {
    return buildFallback(id, url.pathname);
  }

  try {
    const quiz = await client.fetch(QUIZ_ANSWER_BY_ID_QUERY, { id });
    if (!quiz) {
      throw error(404, 'Answer not found');
    }

    const categorySlug = resolveCategorySlug(quiz?.category?.slug);
    const categoryLinkSlug = resolveCategorySlug(quiz?.category?.slug);
    const breadcrumbs = [
      { name: 'クイズ一覧', url: '/quiz' },
      ...(quiz?.category?.title && quiz?.category?.slug
        ? [{ name: quiz.category.title, url: `/category/${categoryLinkSlug}` }]
        : []),
      { name: quiz?.title ?? '問題', url: `/quiz/${categorySlug}/article/${quiz._id}` },
      { name: '正解', url: '' }
    ];

    return { quiz, breadcrumbs };
  } catch (err) {
    if (err?.status === 404) {
      throw err;
    }

    console.error(`[matchstick answer:${id}] Sanity fetch failed`, err);
    return buildFallback(id, url.pathname);
  }
}
