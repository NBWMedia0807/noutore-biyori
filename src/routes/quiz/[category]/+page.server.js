import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { createCategoryDescription, createPageSeo } from '$lib/seo.js';
import { SITE } from '$lib/config/site.js';

const CATEGORY_SLUGS_QUERY = /* groq */ `
*[_type == "category" && defined(slug.current)]{ "slug": slug.current }`;

const QUERY = /* groq */ `
{
  "category": *[_type == "category" && slug.current == $slug][0]{
    title,
    "slug": slug.current,
    description
  },
  "quizzes": *[_type == "quiz" && (
    (defined(category._ref) && category->slug.current == $slug) ||
    (!defined(category._ref) && (category == $slug || category == ^.category.title))
  )] | order(_createdAt desc) {
    _id,
    title,
    "slug": slug.current,
    category->{ title, "slug": slug.current },
    mainImage{ asset->{ url, metadata } },
    problemDescription,
    _createdAt
  }
}`;

export const entries = async () => {
  if (shouldSkipSanityFetch()) {
    return [];
  }

  try {
    const slugs = await client.fetch(CATEGORY_SLUGS_QUERY);
    return Array.isArray(slugs) ? slugs.filter((item) => item?.slug).map((item) => ({ category: item.slug })) : [];
  } catch (err) {
    console.error('[quiz category] Failed to build prerender entries', err);
    return [];
  }
};

const createFallback = (slug, path) => {
  const fallbackTitle = slug ? slug.replace(/-/g, ' ') : 'カテゴリ';
  return {
    category: slug
      ? {
          title: fallbackTitle,
          slug,
          description: ''
        }
      : null,
    quizzes: [],
    seo: createPageSeo({
      title: slug ? `${fallbackTitle}の脳トレ問題` : 'カテゴリ一覧',
      description: slug ? `${fallbackTitle}に関するクイズ一覧ページです。` : 'クイズカテゴリの一覧ページです。',
      path,
      breadcrumbs: slug ? [{ name: fallbackTitle, url: path }] : [{ name: 'クイズ一覧', url: '/quiz' }],
      image: SITE.defaultOgImage
    })
  };
};

export const load = async (event) => {
  const { params, setHeaders, url, isDataRequest } = event;
  const slug = params.category;

  if (!isDataRequest) {
    setHeaders({ 'cache-control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400' });
  }

  if (shouldSkipSanityFetch()) {
    return createFallback(slug, url.pathname);
  }

  try {
    const { category, quizzes } = await client.fetch(QUERY, { slug });

    if (!category) {
      return createFallback(slug, url.pathname);
    }

    const description = createCategoryDescription(category.title, category.description);
    const breadcrumbs = [{ name: category.title, url: url.pathname }];
    const pageTitle = category.title ? `${category.title}の脳トレ問題` : 'カテゴリ一覧';
    const seo = createPageSeo({
      title: pageTitle,
      description,
      path: url.pathname,
      breadcrumbs,
      image: SITE.defaultOgImage
    });

    return { category, quizzes, seo };
  } catch (err) {
    console.error(`[quiz category:${slug}] Sanity fetch failed`, err);
    return createFallback(slug, url.pathname);
  }
};

