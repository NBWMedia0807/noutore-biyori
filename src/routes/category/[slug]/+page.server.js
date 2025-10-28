import { error, redirect } from '@sveltejs/kit';
import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import {
  createCategoryDescription,
  createPageSeo,
  portableTextToPlain,
  resolveOgImageFromQuizzes
} from '$lib/seo.js';
import { SITE } from '$lib/config/site.js';
import { QUIZ_PREVIEW_PROJECTION } from '$lib/queries/quizPreview.js';
import { getQuizStubCategory, getQuizStubQuizzesByCategory } from '$lib/server/quiz-stub.js';
import {
  CATEGORY_DRAFT_FILTER,
  QUIZ_ORDER_BY_PUBLISHED,
  QUIZ_PUBLISHED_FILTER,
  filterVisibleQuizzes
} from '$lib/queries/quizVisibility.js';
import { rankQuizzesByPopularity } from '$lib/utils/quizPopularity.js';
import { resolvePublishedDate } from '$lib/utils/publishedDate.js';

export const prerender = false;

const CATEGORY_SLUGS_QUERY = /* groq */ `
*[_type == "category" && defined(slug.current)${CATEGORY_DRAFT_FILTER}]{
  "slug": slug.current
}`;

const CATEGORY_QUERY = /* groq */ `
*[_type == "category" && slug.current == $slug${CATEGORY_DRAFT_FILTER}][0]{
  title,
  "slug": slug.current,
  description,
  overview
}`;

const CATEGORY_PAGE_SIZE = 10;

const parsePageParam = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  const integer = Math.trunc(parsed);
  return integer >= 1 ? integer : 1;
};

const QUIZZES_BY_CATEGORY_QUERY = /* groq */ `{
  "newest": *[
    _type == "quiz"
    && defined(slug.current)
    && defined(category._ref)
    && category->slug.current == $slug
    ${QUIZ_PUBLISHED_FILTER}
  ] | order(${QUIZ_ORDER_BY_PUBLISHED})[$offset...($offset + $limit)]{
    ${QUIZ_PREVIEW_PROJECTION}
  },
  "popular": *[
    _type == "quiz"
    && defined(slug.current)
    && defined(category._ref)
    && category->slug.current == $slug
    ${QUIZ_PUBLISHED_FILTER}
  ] | order(${QUIZ_ORDER_BY_PUBLISHED})[0...12]{
    ${QUIZ_PREVIEW_PROJECTION}
  },
  "total": count(*[
    _type == "quiz"
    && defined(slug.current)
    && defined(category._ref)
    && category->slug.current == $slug
    ${QUIZ_PUBLISHED_FILTER}
  ]),
}`;

const pickImage = (quiz) =>
  quiz?.problemImage?.asset?.url
    ? quiz.problemImage
    : quiz?.mainImage?.asset?.url
      ? quiz.mainImage
      : quiz?.answerImage?.asset?.url
        ? quiz.answerImage
        : null;

const toMetric = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const toPreview = (quiz) => {
  if (!quiz?.slug) return null;
  const image = pickImage(quiz);
  const context = quiz?._id ?? quiz?.slug ?? 'category';
  const publishedAt = resolvePublishedDate(quiz, context);
  return {
    id: quiz._id ?? quiz.slug,
    title: quiz.title ?? '脳トレ問題',
    slug: quiz.slug,
    category: quiz.category ?? null,
    image,
    problemImage: quiz.problemImage ?? null,
    mainImage: quiz.mainImage ?? quiz.problemImage ?? null,
    answerImage: quiz.answerImage ?? null,
    thumbnailUrl: quiz.thumbnailUrl ?? null,
    publishedAt: publishedAt ?? null,
    _createdAt: quiz?._createdAt ?? null,
    viewCount: toMetric(quiz?.viewCount),
    likeCount: toMetric(quiz?.likeCount),
    popularityScore: toMetric(quiz?.popularityScore)
  };
};

export const entries = async () => {
  if (shouldSkipSanityFetch()) {
    return [];
  }

  try {
    const result = await client.fetch(CATEGORY_SLUGS_QUERY);
    return Array.isArray(result) ? result.filter((item) => item?.slug).map((item) => ({ slug: item.slug })) : [];
  } catch (err) {
    console.error('[category] Failed to build prerender entries', err);
    return [];
  }
};

const createStubCategoryResponse = (slug, path, page, limit) => {
  const stubCategory = getQuizStubCategory(slug);
  const stubQuizzes = getQuizStubQuizzesByCategory(slug);
  const previews = Array.isArray(stubQuizzes) ? stubQuizzes.map(toPreview).filter(Boolean) : [];

  if (!stubCategory) {
    return null;
  }

  const overview = createCategoryDescription(stubCategory.title, '');
  const breadcrumbs = [{ name: stubCategory.title, url: path }];
  const imageUrl = resolveOgImageFromQuizzes(previews, '/logo.svg');
  const totalCount = previews.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const offset = (safePage - 1) * limit;
  const newest = previews.slice(offset, offset + limit);

  return {
    category: { ...stubCategory, description: '', overview },
    overview,
    newest,
    popular: rankQuizzesByPopularity({ primary: previews, fallback: previews, limit: 12 }),
    quizzes: previews,
    totalCount,
    breadcrumbs,
    seo: createPageSeo({
      title: stubCategory.title,
      description: overview,
      path,
      image: imageUrl,
      breadcrumbs
    }),
    ui: {
      hideBreadcrumbs: true
    },
    pagination: {
      currentPage: safePage,
      totalPages,
      totalCount,
      pageSize: limit,
      basePath: path
    }
  };
};

const createFallbackResponse = (slug, path) => {
  const fallbackTitle = slug ? slug.replace(/-/g, ' ') : 'カテゴリ';
  const normalizedTitle = fallbackTitle || 'カテゴリ';
  return {
    category: slug
      ? {
          title: normalizedTitle,
          slug,
          description: '',
          overview: ''
        }
      : null,
    overview: '',
    newest: [],
    popular: [],
    quizzes: [],
    totalCount: 0,
    seo: createPageSeo({
      title: normalizedTitle,
      description: `${normalizedTitle}のクイズ一覧ページです。`,
      path,
      image: '/logo.svg',
      breadcrumbs: slug ? [{ name: normalizedTitle, url: path }] : []
    }),
    breadcrumbs: slug ? [{ name: normalizedTitle, url: path }] : [],
    ui: {
      hideBreadcrumbs: true
    },
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalCount: 0,
      pageSize: CATEGORY_PAGE_SIZE,
      basePath: path
    }
  };
};

export const load = async (event) => {
  const { params, setHeaders, url, isDataRequest } = event;
  const { slug } = params;
  const requestedPage = parsePageParam(url.searchParams.get('page'));
  const offset = (requestedPage - 1) * CATEGORY_PAGE_SIZE;

  if (!isDataRequest) {
    setHeaders({ 'cache-control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400' });
  }

  const resolveStubResponse = () => createStubCategoryResponse(slug, url.pathname, requestedPage, CATEGORY_PAGE_SIZE);

  if (shouldSkipSanityFetch()) {
    const stubData = resolveStubResponse();
    if (stubData) {
      const totalPages = stubData?.pagination?.totalPages ?? 1;
      const safePage = Math.min(requestedPage, Math.max(totalPages, 1));
      if (requestedPage !== safePage) {
        const search = safePage > 1 ? `?page=${safePage}` : '';
        throw redirect(303, `${url.pathname}${search}`);
      }
      return stubData;
    }
    if (requestedPage > 1) {
      throw redirect(303, url.pathname);
    }
    return createFallbackResponse(slug, url.pathname);
  }

  try {
    const category = await client.fetch(CATEGORY_QUERY, { slug });

    if (!category) {
      const stubData = resolveStubResponse();
      if (stubData) {
        console.info(`[category/${slug}] Falling back to stub data because category is missing in Sanity`);
        return stubData;
      }
      throw error(404, 'カテゴリが見つかりません');
    }

    const quizzesResult = await client.fetch(QUIZZES_BY_CATEGORY_QUERY, {
      slug,
      offset,
      limit: CATEGORY_PAGE_SIZE
    });
    const newestSource = filterVisibleQuizzes(quizzesResult?.newest);
    const newest = newestSource.map(toPreview).filter(Boolean);
    const popularSource = rankQuizzesByPopularity({
      primary: quizzesResult?.popular,
      fallback: newestSource,
      limit: 12
    });
    const popular = popularSource.map(toPreview).filter(Boolean);

    const totalCount = typeof quizzesResult?.total === 'number'
      ? quizzesResult.total
      : newestSource.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / CATEGORY_PAGE_SIZE));

    if (requestedPage > totalPages) {
      const targetPage = totalPages;
      const search = targetPage > 1 ? `?page=${targetPage}` : '';
      throw redirect(303, `${url.pathname}${search}`);
    }

    const description = createCategoryDescription(category.title, category.description);
    const overviewPlain = portableTextToPlain(category.overview) || category.overview || '';
    const overview = overviewPlain.trim() || description;
    const breadcrumbs = [{ name: category.title, url: url.pathname }];
    const imageUrl = resolveOgImageFromQuizzes(newest, '/logo.svg');

    const seo = createPageSeo({
      title: category.title,
      description: overview,
      path: url.pathname,
      image: imageUrl,
      breadcrumbs
    });

    return {
      category: { ...category, overview },
      overview,
      newest,
      popular,
      totalCount,
      quizzes: newest,
      breadcrumbs,
      seo,
      ui: {
        hideBreadcrumbs: true
      },
      pagination: {
        currentPage: requestedPage,
        totalPages,
        totalCount,
        pageSize: CATEGORY_PAGE_SIZE,
        basePath: url.pathname
      }
    };
  } catch (err) {
    if (err?.status === 404) {
      throw err;
    }
    console.error(`[category/${slug}] Sanity fetch failed`, err);
    const stubData = resolveStubResponse();
    if (stubData) {
      const totalPages = stubData?.pagination?.totalPages ?? 1;
      const safePage = Math.min(requestedPage, Math.max(totalPages, 1));
      if (requestedPage !== safePage) {
        const search = safePage > 1 ? `?page=${safePage}` : '';
        throw redirect(303, `${url.pathname}${search}`);
      }
      console.info(`[category/${slug}] Using stub data due to Sanity fetch failure`);
      return stubData;
    }
    if (requestedPage > 1) {
      throw redirect(303, url.pathname);
    }
    return createFallbackResponse(slug, url.pathname);
  }
};