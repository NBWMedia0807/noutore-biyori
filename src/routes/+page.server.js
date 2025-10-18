import { env } from '$env/dynamic/private';
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

export const prerender = false;
const homeBypassToken = env.VERCEL_REVALIDATE_TOKEN || env.SANITY_REVALIDATE_SECRET;
const homeIsrConfig = { expiration: false };
if (homeBypassToken) {
  homeIsrConfig.bypassToken = homeBypassToken;
}

export const config = { runtime: 'nodejs22.x', isr: homeIsrConfig };

const HOME_QUERY = /* groq */ `{
  "newest": *[
    _type == "quiz"
    && defined(slug.current)
    ${QUIZ_PUBLISHED_FILTER}
  ] | order(${QUIZ_ORDER_BY_PUBLISHED})[0...12]{
    ${QUIZ_PREVIEW_PROJECTION}
  },
  "popular": *[
    _type == "quiz"
    && defined(slug.current)
    ${QUIZ_PUBLISHED_FILTER}
  ] | order(${QUIZ_ORDER_BY_PUBLISHED})[0...8]{
    ${QUIZ_PREVIEW_PROJECTION}
  },
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

const normalizeCategorySection = (category) => {
  if (!category?.slug) return null;
  const quizzes = sortByPublishedAt(filterVisibleQuizzes(category.quizzes));
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

const buildStubHomeData = (path) => {
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

  const newest = sortByPublishedAt(sections.flatMap((section) => section.quizzes)).slice(0, 12);
  const popular = rankQuizzesByPopularity({
    primary: newest,
    fallback: sections.flatMap((section) => section.quizzes),
    limit: 6
  });
  const seo = createHomeSeo(path, newest.length ? newest : popular);

  return {
    newest,
    popular,
    categories: sections,
    seo
  };
};

export const load = async (event) => {
  const { url, setHeaders, isDataRequest } = event;

  if (!isDataRequest) {
    setHeaders({ 'cache-control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400' });
  }

  const path = url.pathname;

  if (shouldSkipSanityFetch()) {
    if (isQuizStubEnabled()) {
      return buildStubHomeData(path);
    }
    const seo = createHomeSeo(path, []);
    return { newest: [], popular: [], categories: [], seo };
  }

  try {
    const result = await client.fetch(HOME_QUERY);
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

    const aggregatedQuizzes = mergeWithFallback(
      mergeWithFallback(newest, popular),
      categories.flatMap((category) => category.quizzes)
    );

    const seo = createHomeSeo(path, aggregatedQuizzes, SITE.description);

    return {
      newest,
      popular,
      categories,
      seo
    };
  } catch (error) {
    console.error('[+page.server.js] Error fetching quizzes:', error);
    if (isQuizStubEnabled()) {
      return buildStubHomeData(path);
    }
    const seo = createHomeSeo(path, []);
    return { newest: [], popular: [], categories: [], seo };
  }
};
