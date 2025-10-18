import { env } from '$env/dynamic/private';
import { redirect } from '@sveltejs/kit';
import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { SITE } from '$lib/config/site.js';
import { createPageSeo, resolveOgImageFromQuizzes } from '$lib/seo.js';
import { QUIZ_PREVIEW_PROJECTION } from '$lib/queries/quizPreview.js';
import { QUIZ_ORDER_BY_PUBLISHED, QUIZ_PUBLISHED_FILTER, filterVisibleQuizzes } from '$lib/queries/quizVisibility.js';
import { getQuizStubCatalog, getQuizStubDocument, isQuizStubEnabled } from '$lib/server/quiz-stub.js';

export const prerender = false;
const homeBypassToken = env.VERCEL_REVALIDATE_TOKEN || env.SANITY_REVALIDATE_SECRET;
const homeIsrConfig = { expiration: false };
if (homeBypassToken) {
  homeIsrConfig.bypassToken = homeBypassToken;
}

export const config = { runtime: 'nodejs22.x', isr: homeIsrConfig };

codex/restore-top-page-design-and-fix-global-nav
const QUIZZES_QUERY = /* groq */ `
*[
  _type == "quiz"
  && defined(slug.current)
  ${QUIZ_PUBLISHED_FILTER}
] | order(${QUIZ_ORDER_BY_PUBLISHED}) {
  ${QUIZ_PREVIEW_PROJECTION}

const HOME_PAGE_SIZE = 10;

const parsePageParam = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  const integer = Math.trunc(parsed);
  return integer >= 1 ? integer : 1;
};

const HOME_QUERY = /* groq */ `{
  "newest": *[
    _type == "quiz"
    && defined(slug.current)
    ${QUIZ_PUBLISHED_FILTER}
  ] | order(${QUIZ_ORDER_BY_PUBLISHED})[$offset...($offset + $limit)]{
    ${QUIZ_PREVIEW_PROJECTION}
  },
  "popular": *[
    _type == "quiz"
    && defined(slug.current)
    ${QUIZ_PUBLISHED_FILTER}
  ] | order(${QUIZ_ORDER_BY_PUBLISHED})[0...8]{
    ${QUIZ_PREVIEW_PROJECTION}
  },
  "total": count(*[
    _type == "quiz"
    && defined(slug.current)
    ${QUIZ_PUBLISHED_FILTER}
  ]),
  "categories": *[
    _type == "category"
    && defined(slug.current)
    ${CATEGORY_DRAFT_FILTER}
  ] | order(title asc){
    title,
    "slug": slug.current,
    description,
    overview,
    "quizCount": count(*[
      _type == "quiz"
      && defined(slug.current)
      && defined(category._ref)
      && category->slug.current == ^.slug
      ${QUIZ_PUBLISHED_FILTER}
    ]),
    "quizzes": *[
      _type == "quiz"
      && defined(slug.current)
      && defined(category._ref)
      && category->slug.current == ^.slug
      ${QUIZ_PUBLISHED_FILTER}
    ] | order(${QUIZ_ORDER_BY_PUBLISHED})[0...3]{
      ${QUIZ_PREVIEW_PROJECTION}
    }
  }
main
}`;

const pickImageSource = (quiz) =>
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
  const slug = typeof quiz?.slug === 'string' ? quiz.slug : quiz?.slug?.current;
  if (!slug) return null;
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
    publishedAt: quiz?.publishedAt ?? quiz?._createdAt ?? null,
    _createdAt: quiz?._createdAt ?? null,
    viewCount: toMetric(quiz?.viewCount),
    likeCount: toMetric(quiz?.likeCount),
    popularityScore: toMetric(quiz?.popularityScore)
  };
};

const sortByPublishedAt = (list) =>
  (Array.isArray(list) ? list : [])
    .map(toPreview)
    .filter(Boolean)
    .sort((a, b) => {
      const aDate = new Date(a?.publishedAt ?? a?._createdAt ?? 0).getTime();
      const bDate = new Date(b?.publishedAt ?? b?._createdAt ?? 0).getTime();
      return bDate - aDate;
    });

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

codex/restore-top-page-design-and-fix-global-nav
const buildStubQuizzes = () => {
  if (!isQuizStubEnabled()) {
    return [];
  }

  try {
    const catalog = getQuizStubCatalog();
    const docs = Array.isArray(catalog)
      ? catalog.map((entry) => (entry?.slug ? getQuizStubDocument(entry.slug) : null)).filter(Boolean)
      : [];
    return sortByPublishedAt(docs);
  } catch (error) {
    console.error('[+page.server] Failed to resolve stub quizzes for home page:', error);
    return [];
  }

const buildStubHomeData = (path, page, limit) => {
  const categories = getQuizStubCategories();
  const sections = categories
    .map((category) => {
      const quizzes = getQuizStubQuizzesByCategory(category.slug).map(toPreview).filter(Boolean);
      return {
        title: category.title,
        slug: category.slug,
        overview: createCategoryDescription(category.title, ''),
        quizCount: quizzes.length,
        quizzes
      };
    })
    .filter((section) => section && section.quizzes.length > 0);

  const allNewest = sortByPublishedAt(sections.flatMap((section) => section.quizzes));
  const totalCount = allNewest.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const offset = (safePage - 1) * limit;
  const newest = allNewest.slice(offset, offset + limit);
  const popular = rankQuizzesByPopularity({
    primary: allNewest,
    fallback: sections.flatMap((section) => section.quizzes),
    limit: 6
  });
  const seo = createHomeSeo(path, newest.length ? newest : popular);

  return {
    newest,
    popular,
    categories: sections,
    seo,
    pagination: {
      currentPage: safePage,
      totalPages,
      totalCount,
      pageSize: limit,
      basePath: path
    }
  };
main
};

export const load = async (event) => {
  const { url, setHeaders, isDataRequest } = event;

  if (!isDataRequest) {
    setHeaders({ 'cache-control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400' });
  }

  const path = url.pathname;
codex/restore-top-page-design-and-fix-global-nav
  const stubQuizzes = buildStubQuizzes();

  if (shouldSkipSanityFetch()) {
    const quizzes = stubQuizzes;
    return { quizzes, seo: createHomeSeo(path, quizzes) };
  }

  try {
    const result = await client.fetch(QUIZZES_QUERY);
    const quizzes = sortByPublishedAt(filterVisibleQuizzes(result));

  const requestedPage = parsePageParam(url.searchParams.get('page'));
  const offset = (requestedPage - 1) * HOME_PAGE_SIZE;

  if (shouldSkipSanityFetch()) {
    if (isQuizStubEnabled()) {
      const stubData = buildStubHomeData(path, requestedPage, HOME_PAGE_SIZE);
      const totalPages = stubData?.pagination?.totalPages ?? 1;
      const safePage = Math.min(requestedPage, Math.max(totalPages, 1));
      if (requestedPage !== safePage) {
        const search = safePage > 1 ? `?page=${safePage}` : '';
        throw redirect(303, `${path}${search}`);
      }
      return stubData;
    }
    const seo = createHomeSeo(path, []);
    if (requestedPage > 1) {
      throw redirect(303, path);
    }
    return {
      newest: [],
      popular: [],
      categories: [],
      seo,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        pageSize: HOME_PAGE_SIZE,
        basePath: path
      }
    };
  }

  try {
    const result = await client.fetch(HOME_QUERY, {
      offset,
      limit: HOME_PAGE_SIZE
    });
    const newestSource = filterVisibleQuizzes(result?.newest);
    const newest = sortByPublishedAt(newestSource);
    const popularSource = rankQuizzesByPopularity({
      primary: result?.popular,
      fallback: newestSource,
      limit: 6
    });
    const popular = popularSource.map(toPreview).filter(Boolean);
    const categories = Array.isArray(result?.categories)
      ? result.categories.map(normalizeCategorySection).filter(Boolean)
      : [];
    const totalCount = typeof result?.total === 'number' ? result.total : newestSource.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / HOME_PAGE_SIZE));

    if (requestedPage > totalPages) {
      const targetPage = totalPages;
      const search = targetPage > 1 ? `?page=${targetPage}` : '';
      throw redirect(303, `${path}${search}`);
    }

    const aggregatedQuizzes = mergeWithFallback(
      mergeWithFallback(newest, popular),
      categories.flatMap((category) => category.quizzes)
    );
main

    if (quizzes.length === 0 && stubQuizzes.length > 0) {
      const seo = createHomeSeo(path, stubQuizzes);
      return { quizzes: stubQuizzes, seo };
    }

    const seo = createHomeSeo(path, quizzes);
    return { quizzes, seo };
  } catch (error) {
    console.error('[+page.server.js] Failed to load home page data:', error);
    const quizzes = stubQuizzes;
    return { quizzes, seo: createHomeSeo(path, quizzes) };
    return {
      newest,
      popular,
      categories,
      seo,
      pagination: {
        currentPage: requestedPage,
        totalPages,
        totalCount,
        pageSize: HOME_PAGE_SIZE,
        basePath: path
      }
    };
  } catch (error) {
    console.error('[+page.server.js] Error fetching quizzes:', error);
    if (isQuizStubEnabled()) {
      const stubData = buildStubHomeData(path, requestedPage, HOME_PAGE_SIZE);
      const totalPages = stubData?.pagination?.totalPages ?? 1;
      const safePage = Math.min(requestedPage, Math.max(totalPages, 1));
      if (requestedPage !== safePage) {
        const search = safePage > 1 ? `?page=${safePage}` : '';
        throw redirect(303, `${path}${search}`);
      }
      return stubData;
    }
    const seo = createHomeSeo(path, []);
    if (requestedPage > 1) {
      throw redirect(303, path);
    }
    return {
      newest: [],
      popular: [],
      categories: [],
      seo,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        pageSize: HOME_PAGE_SIZE,
        basePath: path
      }
    };
  }
};
