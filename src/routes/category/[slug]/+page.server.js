import { error } from '@sveltejs/kit';
import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { createCategoryDescription, createPageSeo } from '$lib/seo.js';

export const prerender = false;

const CATEGORY_SLUGS_QUERY = /* groq */ `
*[_type == "category" && defined(slug.current) && !(_id in path("drafts.**"))]{
  "slug": slug.current
}`;

const CATEGORY_QUERY = /* groq */ `
*[_type == "category" && slug.current == $slug && !(_id in path("drafts.**"))][0]{
  title,
  "slug": slug.current,
  description
}`;

const QUIZZES_BY_CATEGORY_QUERY = /* groq */ `
*[_type == "quiz" && defined(slug.current) && !(_id in path("drafts.**")) && (
  (defined(category._ref) && category->slug.current == $slug) ||
  (!defined(category._ref) && defined(category.slug.current) && category.slug.current == $slug) ||
  (!defined(category._ref) && defined(category) && (category == $categoryTitle || category == $slug)) ||
  (!defined(category) && defined($categoryMatch) && $categoryMatch != '' && title match $categoryMatch)
)] | order(_createdAt desc) {
  _id,
  _createdAt,
  title,
  "slug": slug.current,
  category->{ _id, title, "slug": slug.current },
  category,
  mainImage{
    ..., 
    asset->{ url, metadata }
  },
  answerImage{
    ..., 
    asset->{ url, metadata }
  },
  problemImage{
    ..., 
    asset->{ url, metadata }
  }
}`;

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

const createFallbackResponse = (slug, path) => {
  const fallbackTitle = slug ? slug.replace(/-/g, ' ') : 'カテゴリ';
  const normalizedTitle = fallbackTitle || 'カテゴリ';
  return {
    category: slug
      ? {
          title: normalizedTitle,
          slug,
          description: ''
        }
      : null,
    quizzes: [],
    seo: createPageSeo({
      title: normalizedTitle,
      description: `${normalizedTitle}のクイズ一覧ページです。`,
      path,
      breadcrumbs: slug ? [{ name: normalizedTitle, url: path }] : []
    })
  };
};

export const load = async (event) => {
  const { params, setHeaders, url, isDataRequest } = event;
  const { slug } = params;

  if (!isDataRequest) {
    setHeaders({ 'cache-control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400' });
  }

  if (shouldSkipSanityFetch()) {
    return createFallbackResponse(slug, url.pathname);
  }

  try {
    const category = await client.fetch(CATEGORY_QUERY, { slug });

    if (!category) {
      throw error(404, 'カテゴリが見つかりません');
    }

    const quizzes = await client.fetch(QUIZZES_BY_CATEGORY_QUERY, {
      slug,
      categoryTitle: category.title,
      categoryMatch: `*${category.title}*`
    });
    const normalizedQuizzes = Array.isArray(quizzes)
      ? quizzes.filter((quiz) => quiz && typeof quiz.slug === 'string' && quiz.slug.length > 0)
      : [];

    const description = createCategoryDescription(category.title, category.description);
    const breadcrumbs = [{ name: category.title, url: url.pathname }];
    const seo = createPageSeo({
      title: category.title,
      description,
      path: url.pathname,
      breadcrumbs
    });

    return {
      category,
      quizzes: normalizedQuizzes,
      seo
    };
  } catch (err) {
    if (err?.status === 404) {
      throw err;
    }
    console.error(`[category/${slug}] Sanity fetch failed`, err);
    return createFallbackResponse(slug, url.pathname);
  }
};
