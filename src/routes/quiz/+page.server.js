import { redirect } from '@sveltejs/kit';
import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { createPageSeo } from '$lib/seo.js';
import { QUIZ_PREVIEW_PROJECTION } from '$lib/queries/quizPreview.js';
import {
  QUIZ_ORDER_BY_PUBLISHED,
  QUIZ_PUBLISHED_FILTER,
  filterVisibleQuizzes
} from '$lib/queries/quizVisibility.js';

export const prerender = false;
export const config = { runtime: 'nodejs22.x' };

// 全件フェッチは記事数に比例して TTFB・転送量・Sanity コストが悪化するため、
// ホーム・カテゴリと同じ12件ページングに統一する。
const QUIZ_LIST_PAGE_SIZE = 12;

const parsePageParam = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  const integer = Math.trunc(parsed);
  return integer >= 1 ? integer : 1;
};

const QUIZZES_QUERY = /* groq */ `{
  "items": *[
    _type == "quiz"
    && defined(slug.current)
    ${QUIZ_PUBLISHED_FILTER}
  ] | order(${QUIZ_ORDER_BY_PUBLISHED})[$offset...($offset + $limit)] {
    ${QUIZ_PREVIEW_PROJECTION},
    problemDescription
  },
  "total": count(*[
    _type == "quiz"
    && defined(slug.current)
    ${QUIZ_PUBLISHED_FILTER}
  ])
}`;

const createQuizListSeo = (path) =>
  createPageSeo({
    title: 'クイズ一覧',
    description:
      '脳トレ日和で公開中のクイズ一覧です。マッチ棒クイズや間違い探しなど、バリエーション豊かな問題に挑戦できます。',
    path,
    breadcrumbs: [{ name: 'クイズ一覧', url: path }]
  });

const createEmptyPagination = (path) => ({
  currentPage: 1,
  totalPages: 1,
  totalCount: 0,
  pageSize: QUIZ_LIST_PAGE_SIZE,
  basePath: path
});

export const load = async (event) => {
  const { url, setHeaders, isDataRequest } = event;
  const path = url.pathname;
  const requestedPage = parsePageParam(url.searchParams.get('page'));
  const offset = (requestedPage - 1) * QUIZ_LIST_PAGE_SIZE;

  if (!isDataRequest) {
    setHeaders({ 'cache-control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400' });
  }

  if (shouldSkipSanityFetch()) {
    return {
      quizzes: [],
      seo: createQuizListSeo(path),
      pagination: createEmptyPagination(path)
    };
  }

  try {
    const result = await client.fetch(QUIZZES_QUERY, { offset, limit: QUIZ_LIST_PAGE_SIZE });
    const quizzes = filterVisibleQuizzes(result?.items);

    const totalCount = typeof result?.total === 'number' ? result.total : quizzes.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / QUIZ_LIST_PAGE_SIZE));

    if (requestedPage > totalPages) {
      const targetPage = totalPages;
      const search = targetPage > 1 ? `?page=${targetPage}` : '';
      throw redirect(303, `${path}${search}`);
    }

    return {
      quizzes,
      seo: createQuizListSeo(path),
      pagination: {
        currentPage: requestedPage,
        totalPages,
        totalCount,
        pageSize: QUIZ_LIST_PAGE_SIZE,
        basePath: path
      }
    };
  } catch (error) {
    if (error?.status === 303) throw error;
    console.error('[quiz/+page.server] Error fetching quizzes:', error);
    return {
      quizzes: [],
      seo: createQuizListSeo(path),
      pagination: createEmptyPagination(path)
    };
  }
};
