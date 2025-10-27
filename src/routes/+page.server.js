// src/routes/+page.server.js
import { redirect } from '@sveltejs/kit';
import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { SITE } from '$lib/config/site.js';
import {
  createCategoryDescription,
  createPageSeo,
  portableTextToPlain,
  resolveOgImageFromQuizzes
} from '$lib/seo.js';
import { QUIZ_PREVIEW_PROJECTION } from '$lib/queries/quizPreview.js';
import {
  CATEGORY_DRAFT_FILTER,
  QUIZ_ORDER_BY_PUBLISHED,
  QUIZ_PUBLISHED_FILTER,
  filterVisibleQuizzes
} from '$lib/queries/quizVisibility.js';
import {
  getQuizStubCategories,
  getQuizStubQuizzesByCategory,
  isQuizStubEnabled
} from '$lib/server/quiz-stub.js';
import { mergeWithFallback, rankQuizzesByPopularity } from '$lib/utils/quizPopularity.js';
import { resolvePublishedDate } from '$lib/utils/publishedDate.js';

export const prerender = false;
export const config = { runtime: 'nodejs22.x' };

const HOME_PAGE_SIZE = 10;

const parsePageParam = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  const integer = Math.trunc(parsed);
  return integer >= 1 ? integer : 1;
};

const HOME_QUERY = /* groq */ `
{
  "newest": *[
    _type == "quiz" &&
    defined(slug.current)
    ${QUIZ_PUBLISHED_FILTER}
  ] | order(${QUIZ_ORDER_BY_PUBLISHED})[$offset...($offset + $limit)]{
    ${QUIZ_PREVIEW_PROJECTION}
  },

  "popular": *[
    _type == "quiz" &&
    defined(slug.current)
    ${QUIZ_PUBLISHED_FILTER}
  ] | order(${QUIZ_ORDER_BY_PUBLISHED})[0...8]{
    ${QUIZ_PREVIEW_PROJECTION}
  },

  "total": count(*[
    _type == "quiz" &&
    defined(slug.current)
    ${QUIZ_PUBLISHED_FILTER}
  ]),

  "categories": *[
    _type == "category" &&
    defined(slug.current)
    ${CATEGORY_DRAFT_FILTER}
  ] | order(title asc){
    title,
    "slug": slug.current,
    "description": coalesce(description, ""),
    "overview": coalesce(overview, description, ""),
    "quizCount": count(*[
      _type == "quiz" &&
      defined(slug.current) &&
      defined(category._ref) &&
      category->slug.current == ^.slug
      ${QUIZ_PUBLISHED_FILTER}
    ]),
    "quizzes": *[
      _type == "quiz" &&
      defined(slug.current) &&
      defined(category._ref) &&
      category->slug.current == ^.slug
      ${QUIZ_PUBLISHED_FILTER}
    ] | order(${QUIZ_ORDER_BY_PUBLISHED})[0...3]{
      ${QUIZ_PREVIEW_PROJECTION}
    }
  }
}
`;

const pickImageSource = (quiz) =>
  quiz?.problemImage?.asset?.url
    ? quiz.problemImage
    : quiz?.mainImage?.asset?.url
      ? quiz.mainImage
      : quiz?.answerImage?.asset?.url
        ? quiz.answerImage
        : null;

const toMetric = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const toPreview = (quiz) => {
  const slug = typeof quiz?.slug === 'string' ? quiz.slug : quiz?.slug?.current;
  if (!slug) return null;
  const context = quiz?._id ?? slug;
  const publishedAt = resolvePublishedDate(quiz, context);
  return {
    id: quiz._id ?? slug,
    title: quiz.title ?? '脳トレ問題',
    slug,
    category: quiz.category ?? null,
    image: pickImageSource(quiz),
    problemImage: quiz.problemImage ?? null,
    mainImage: quiz.mainImage ?? null,
    answerImage: quiz.answerImage ?? null,
    thumbnailUrl: quiz.thumbnailUrl ?? null,
    publishedAt: publishedAt ?? null,
    _createdAt: quiz?._createdAt ?? null,
    viewCount: toMetric(quiz?.viewCount),
    likeCount: toMetric(quiz?.likeCount),
    popularityScore: toMetric(quiz?.popularityScore)
  };
};

const normalizeCategorySection = (category) => {
  if (!category?.slug) return null;
  const quizzes = filterVisibleQuizzes(category.quizzes).map(toPreview).filter(Boolean);
  const description = createCategoryDescription(category.title, category.description);
  const overviewPlain = portableTextToPlain(category.overview) || category.overview || '';
  const overview = overviewPlain.trim() || description;
  const quizCount = typeof category.quizCount === 'number' ? category.quizCount : quizzes.length;

  return {
    title: category.title ?? 'カテゴリ',
    slug: category.slug,
    overview,
    quizCount,
    quizzes
  };
};

const createHomeSeo = (path, quizzes, description = SITE.description) => {
  const ogCandidates = Array.isArray(quizzes) ? quizzes : [];
  const image = resolveOgImageFromQuizzes(ogCandidates, '/logo.svg');
  return createPageSeo({
    title: `${SITE.name}｜${SITE.tagline}`,
    description,
    path,
    image,
    appendSiteName: false
  });
};

export const load = async (event) => {
  const { url, setHeaders, isDataRequest } = event;

  if (isDataRequest) {
    setHeaders({ 'cache-control': 'no-store' });
  } else {
    setHeaders({
      'cache-control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400'
    });
  }

  const path = url.pathname;
  const requestedPage = parsePageParam(url.searchParams.get('page'));
  const pageSize = HOME_PAGE_SIZE;
  const offset = Math.max(0, (requestedPage - 1) * pageSize);

  try {
    const result = await client.fetch(HOME_QUERY, { offset, limit: pageSize });
    if (!result || typeof result !== 'object') {
      throw new Error('Sanity returned empty or invalid result');
    }

    const newestSource = filterVisibleQuizzes(result.newest ?? []);
    const newest = newestSource.map(toPreview).filter(Boolean);

    const popularSource = rankQuizzesByPopularity({
      primary: result.popular ?? [],
      fallback: newestSource,
      limit: 6
    });
    const popular = popularSource.map(toPreview).filter(Boolean);

    const categories = Array.isArray(result.categories)
      ? result.categories.map(normalizeCategorySection).filter(Boolean)
      : [];

    const totalCount = typeof result.total === 'number' ? result.total : newestSource.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    if (requestedPage > totalPages) {
      const targetPage = totalPages;
      const search = targetPage > 1 ? `?page=${targetPage}` : '';
      throw redirect(303, `${path}${search}`);
    }

    const aggregatedQuizzes = mergeWithFallback(
      mergeWithFallback(newest, popular),
      categories.flatMap((category) => category.quizzes)
    );

    const seo = createHomeSeo(path, aggregatedQuizzes, SITE.description);

    return {
      newest,
      popular,
      categories,
      seo,
      pagination: {
        currentPage: requestedPage,
        totalPages,
        totalCount,
        pageSize,
        basePath: path
      }
    };
  } catch (error) {
    console.error('[+page.server.js] Error fetching quizzes:', error);
    const seo = createHomeSeo(path, []);
    return {
      newest: [],
      popular: [],
      categories: [],
      seo,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        pageSize,
        basePath: path
      }
    };
  }
};
