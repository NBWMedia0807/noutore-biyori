// src/routes/category/[slug]/+page.server.js
export const prerender = false;

import { client } from '$lib/sanity.server.js';

const CATEGORY_BY_SLUG = {
  matchstick: 'マッチ棒クイズ',
  'spot-the-difference': '間違い探し'
};

const Q = /* groq */ `
*[_type == "quiz" && ((defined(category._ref) && category->title == $category) || (!defined(category._ref) && category == $category))] | order(_createdAt desc) {
  _id,
  _createdAt,
  title,
  "slug": slug.current,
  category->{ _id, title },
  mainImage{ asset->{ url, metadata } },
  answerImage{ asset->{ url, metadata } }
}`;

export const load = async ({ params }) => {
  const slug = params.slug;
  const categoryTitle = CATEGORY_BY_SLUG[slug] ?? '';

  if (!categoryTitle) {
    return { quizzes: [], categoryTitle: '' };
  }

  try {
    const quizzes = await client.fetch(Q, { category: categoryTitle });
    return { quizzes: quizzes ?? [], categoryTitle };
  } catch (e) {
    console.error('[category/+page.server] fetch failed', e);
    return { quizzes: [], categoryTitle };
  }
};
