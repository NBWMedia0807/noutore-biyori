// src/routes/category/[slug]/+page.server.js
export const prerender = false;

import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity.server.js';

const CATEGORY_QUERY = /* groq */ `
  *[_type == "category" && slug.current == $slug][0]{
    _id,
    title,
    "slug": slug.current
  }
`;

const QUIZ_BY_CATEGORY_QUERY = /* groq */ `
  *[_type == "quiz" && defined(category->_ref) && category->slug.current == $slug]
    | order(_createdAt desc) {
      _id,
      _createdAt,
      title,
      "slug": slug.current,
      category->{ _id, title },
      mainImage{ asset->{ url, metadata } },
      answerImage{ asset->{ url, metadata } }
    }
`;

export const load = async ({ params, setHeaders }) => {
  const { slug } = params;
  setHeaders({ 'cache-control': 'no-store' });

  try {
    const category = await client.fetch(CATEGORY_QUERY, { slug });

    if (!category) {
      throw error(404, 'カテゴリが見つかりませんでした');
    }

    const quizzes = await client.fetch(QUIZ_BY_CATEGORY_QUERY, { slug });

    return {
      category,
      quizzes: quizzes ?? []
    };
  } catch (err) {
    if (err?.status === 404) {
      throw err;
    }
    console.error('[category/+page.server] fetch failed', err);
    throw error(500, 'カテゴリ情報の取得に失敗しました');
  }
};
