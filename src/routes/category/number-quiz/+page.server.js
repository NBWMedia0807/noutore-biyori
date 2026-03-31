import { error, redirect } from '@sveltejs/kit';
import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import {
  createCategoryDescription,
  createPageSeo,
  portableTextToPlain,
  resolveOgImageFromQuizzes
} from '$lib/seo.js';
import { QUIZ_PREVIEW_PROJECTION } from '$lib/queries/quizPreview.js';
import {
  QUIZ_ORDER_BY_PUBLISHED,
  QUIZ_PUBLISHED_FILTER,
  filterVisibleQuizzes
} from '$lib/queries/quizVisibility.js';
import { rankQuizzesByPopularity } from '$lib/utils/quizPopularity.js';
import { resolvePublishedDate } from '$lib/utils/publishedDate.js';

export const prerender = false;

const CATEGORY_SLUG = 'number-quiz';
const CATEGORY_TITLE = '数字クイズ';

const CATEGORY_QUERY = /* groq */ `
*[_type == "category" && slug.current == $slug][0]{
  title,
  "slug": slug.current,
  description,
  overview
}`;

const CATEGORY_PAGE_SIZE = 12;

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

const createFallbackResponse = (path) => {
  const fallbackTitle = CATEGORY_TITLE;
  return {
    category: {
        title: fallbackTitle,
        slug: CATEGORY_SLUG,
        description: '',
        overview: ''
    },
    overview: '',
    newest: [],
    popular: [],
    quizzes: [],
    totalCount: 0,
    seo: createPageSeo({
      title: fallbackTitle,
      description: `${fallbackTitle}のクイズ一覧ページです。`,
      path,
      image: '/logo.svg',
      breadcrumbs: [{ name: fallbackTitle, url: path }]
    }),
    breadcrumbs: [{ name: fallbackTitle, url: path }],
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
  const { setHeaders, url, isDataRequest } = event;
  const requestedPage = parsePageParam(url.searchParams.get('page'));
  const offset = (requestedPage - 1) * CATEGORY_PAGE_SIZE;

  if (!isDataRequest) {
    setHeaders({ 'cache-control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400' });
  }

  if (shouldSkipSanityFetch()) {
    if (requestedPage > 1) {
      throw redirect(303, url.pathname);
    }
    return createFallbackResponse(url.pathname);
  }

  try {
    const category = await client.fetch(CATEGORY_QUERY, { slug: CATEGORY_SLUG });

    // If category doesn't exist in Sanity, we still want to show the page with a title.
    const pageCategory = category || { title: CATEGORY_TITLE, slug: CATEGORY_SLUG };

    const quizzesResult = await client.fetch(QUIZZES_BY_CATEGORY_QUERY, {
      slug: CATEGORY_SLUG,
      offset,
      limit: CATEGORY_PAGE_SIZE
    });

    const newestSource = filterVisibleQuizzes(quizzesResult?.newest || []);
    const newest = newestSource.map(toPreview).filter(Boolean);
    const popularSource = rankQuizzesByPopularity({
      primary: quizzesResult?.popular || [],
      fallback: newestSource,
      limit: 12
    });
    const popular = popularSource.map(toPreview).filter(Boolean);

    const totalCount = typeof quizzesResult?.total === 'number' ? quizzesResult.total : 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / CATEGORY_PAGE_SIZE));

    if (requestedPage > 1 && requestedPage > totalPages) {
      const targetPage = totalPages > 0 ? totalPages : 1;
      const search = targetPage > 1 ? `?page=${targetPage}` : '';
      throw redirect(303, `${url.pathname}${search}`);
    }

    const description = createCategoryDescription(pageCategory.title, pageCategory.description);
    const overviewPlain = portableTextToPlain(pageCategory.overview) || pageCategory.overview || '';
    const overview = overviewPlain.trim() || description;
    const breadcrumbs = [{ name: pageCategory.title, url: url.pathname }];
    const imageUrl = resolveOgImageFromQuizzes(newest, '/logo.svg');

    const seo = createPageSeo({
      title: pageCategory.title,
      description: overview,
      path: url.pathname,
      image: imageUrl,
      breadcrumbs
    });

    return {
      category: { ...pageCategory, overview },
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
    console.error(`[category/${CATEGORY_SLUG}] Sanity fetch failed`, err);
    if (requestedPage > 1) {
      throw redirect(303, url.pathname);
    }
    return createFallbackResponse(url.pathname);
  }
};
