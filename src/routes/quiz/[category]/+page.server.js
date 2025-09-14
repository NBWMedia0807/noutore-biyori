import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity.server.js';

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

export const load = async ({ params, setHeaders }) => {
  setHeaders({ 'cache-control': 'no-store' });
  const slug = params.category;
  const { category, quizzes } = await client.fetch(QUERY, { slug });
  if (!category) {
    // カテゴリが存在しない
    return { category: null, quizzes: [] };
  }
  return { category, quizzes };
};

