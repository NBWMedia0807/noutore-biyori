import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity.server.js';
import { createCategoryDescription, createPageSeo } from '$lib/seo.js';

export const prerender = false;

const CATEGORY_QUERY = /* groq */ `
*[_type == "category" && slug.current == $slug][0]{
  title,
  "slug": slug.current,
  description
}`;

const QUIZZES_BY_CATEGORY_QUERY = /* groq */ `
*[_type == "quiz" && (
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
  mainImage{ asset->{ url, metadata } },
  answerImage{ asset->{ url, metadata } }
}`;

export const load = async ({ params, setHeaders, url }) => {
  const { slug } = params;
  setHeaders({ 'cache-control': 'no-store' });

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
      quizzes: quizzes ?? [],
      seo
    };
  } catch (err) {
    if (err?.status === 404) {
      throw err;
    }
    console.error(`[category/${slug}] Sanity fetch failed`, err);
    throw error(500, 'カテゴリ情報の取得に失敗しました');
  }
};
