import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity.server.js';
import { createCategoryDescription, createPageSeo } from '$lib/seo.js';
import { SITE } from '$lib/config/site.js';

const QUERY = /* groq */ `
{
  "category": *[_type == "category" && slug.current == $slug][0]{title, "slug": slug.current},
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

export const prerender = false;

export const load = async ({ params, setHeaders, url }) => {
  setHeaders({ 'cache-control': 'no-store' });
  const slug = params.category;
  const { category, quizzes } = await client.fetch(QUERY, { slug });
  if (!category) {
    // カテゴリが存在しない
    return {
      category: null,
      quizzes: [],
      seo: createPageSeo({
        title: 'カテゴリが見つかりません',
        description: 'お探しのカテゴリは存在しません。',
        path: url.pathname,
        breadcrumbs: [{ name: 'クイズ一覧', url: '/quiz' }]
      })
    };
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
};

