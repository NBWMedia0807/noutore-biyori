import { error } from '@sveltejs/kit';
import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { createCategoryDescription, createPageSeo, portableTextToPlain } from '$lib/seo.js';
import { SITE } from '$lib/config/site.js';
import { QUIZ_PREVIEW_PROJECTION } from '$lib/queries/quizPreview.js';
import { getQuizStubCategory, getQuizStubQuizzesByCategory } from '$lib/server/quiz-stub.js';
import {
  CATEGORY_DRAFT_FILTER,
  QUIZ_ORDER_BY_PUBLISHED,
  QUIZ_PUBLISHED_FILTER,
  filterVisibleQuizzes
} from '$lib/queries/quizVisibility.js';
import { createQuizCategoryTag } from '$lib/cache/tags.js';

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

const QUIZ_CATEGORY_MATCH = /* groq */ `select(
  $slug in ["crossword", "kanji-mistake"] =>
    count(categories[]->slug.current[@ in ["crossword", "kanji-mistake"] && @ == $slug]) > 0,
  defined(category._ref) && category->slug.current == $slug
)`;

const QUIZZES_BY_CATEGORY_QUERY = /* groq */ `{
  "newest": *[
    _type == "quiz"
    && defined(slug.current)
    && ${QUIZ_CATEGORY_MATCH}
    ${QUIZ_PUBLISHED_FILTER}
  ] | order(${QUIZ_ORDER_BY_PUBLISHED})[0...24]{
    ${QUIZ_PREVIEW_PROJECTION}
  },
  "popular": *[
    _type == "quiz"
    && defined(slug.current)
    && ${QUIZ_CATEGORY_MATCH}
    ${QUIZ_PUBLISHED_FILTER}
  ] | order(${QUIZ_ORDER_BY_PUBLISHED})[0...12]{
    ${QUIZ_PREVIEW_PROJECTION}
  },
  "total": count(*[
    _type == "quiz"
    && defined(slug.current)
    && ${QUIZ_CATEGORY_MATCH}
    ${QUIZ_PUBLISHED_FILTER}
  ])
}`;

const pickImage = (quiz) =>
  quiz?.problemImage?.asset?.url
    ? quiz.problemImage
    : quiz?.mainImage?.asset?.url
      ? quiz.mainImage
      : quiz?.answerImage?.asset?.url
        ? quiz.answerImage
        : null;

const toPreview = (quiz) => {
  if (!quiz?.slug) return null;
  const image = pickImage(quiz);
  return {
    id: quiz._id ?? quiz.slug,
    title: quiz.title ?? '脳トレ問題',
    slug: quiz.slug,
    category: quiz.category ?? null,
    image,
    problemImage: quiz.problemImage ?? null,
    mainImage: quiz.mainImage ?? null,
    answerImage: quiz.answerImage ?? null,
    thumbnailUrl: quiz.thumbnailUrl ?? null,
    publishedAt: quiz?.effectivePublishedAt ?? quiz?.publishedAt ?? quiz?._createdAt ?? null,
    effectivePublishedAt: quiz?.effectivePublishedAt ?? quiz?.publishedAt ?? quiz?._createdAt ?? null
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

const createStubCategoryResponse = (slug, path) => {
  const stubCategory = getQuizStubCategory(slug);
  const stubQuizzes = getQuizStubQuizzesByCategory(slug);
  const previews = Array.isArray(stubQuizzes) ? stubQuizzes.map(toPreview).filter(Boolean) : [];

  if (!stubCategory) {
    return null;
  }

  const overview = createCategoryDescription(stubCategory.title, '');
  const breadcrumbs = [{ name: stubCategory.title, url: path }];
  const heroImage = pickImage(previews[0]);
  const imageUrl = heroImage?.asset?.url ?? SITE.defaultOgImage;

  return {
    category: { ...stubCategory, description: '', overview },
    overview,
    newest: previews,
    popular: previews,
    quizzes: previews,
    totalCount: previews.length,
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
      breadcrumbs: slug ? [{ name: normalizedTitle, url: path }] : []
    }),
    breadcrumbs: slug ? [{ name: normalizedTitle, url: path }] : [],
    ui: {
      hideBreadcrumbs: true
    }
  };
};

export const load = async (event) => {
  const { params, setHeaders, url, isDataRequest, depends } = event;
  const { slug } = params;

  depends(createQuizCategoryTag(slug));

  if (!isDataRequest) {
    setHeaders({ 'cache-control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400' });
  }

  const resolveStubResponse = () => createStubCategoryResponse(slug, url.pathname);

  if (shouldSkipSanityFetch()) {
    const stubData = resolveStubResponse();
    if (stubData) {
      return stubData;
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

    const quizzesResult = await client.fetch(QUIZZES_BY_CATEGORY_QUERY, { slug });
    const newestSource = filterVisibleQuizzes(quizzesResult?.newest);
    const popularSource = filterVisibleQuizzes(quizzesResult?.popular);

    const newest = newestSource.map(toPreview).filter(Boolean);
    const popular = popularSource.map(toPreview).filter(Boolean);

    const totalCount = typeof quizzesResult?.total === 'number'
      ? quizzesResult.total
      : newestSource.length;

    const description = createCategoryDescription(category.title, category.description);
    const overviewPlain = portableTextToPlain(category.overview) || category.overview || '';
    const overview = overviewPlain.trim() || description;
    const breadcrumbs = [{ name: category.title, url: url.pathname }];
    const heroImage = pickImage(newest[0]);
    const imageUrl = heroImage?.asset?.url ?? SITE.defaultOgImage;

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
      }
    };
  } catch (err) {
    if (err?.status === 404) {
      throw err;
    }
    console.error(`[category/${slug}] Sanity fetch failed`, err);
    const stubData = resolveStubResponse();
    if (stubData) {
      console.info(`[category/${slug}] Using stub data due to Sanity fetch failure`);
      return stubData;
    }
    return createFallbackResponse(slug, url.pathname);
  }
};