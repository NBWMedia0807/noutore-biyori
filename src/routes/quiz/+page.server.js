import { client } from '$lib/sanity.server.js';
import { createPageSeo } from '$lib/seo.js';

const QUIZZES_QUERY = /* groq */ `
*[_type == "quiz"] | order(_createdAt desc) {
  _id,
  title,
  "slug": slug.current,
  category->{ title, "slug": slug.current },
  mainImage{ asset->{ url, metadata } },
  problemDescription
}`;

export const load = async ({ url }) => {
  try {
    const result = await client.fetch(QUIZZES_QUERY);
    const quizzes = Array.isArray(result) ? result.filter(Boolean) : [];

    const seo = createPageSeo({
      title: 'クイズ一覧',
      description:
        '脳トレ日和で公開中のクイズ一覧です。マッチ棒クイズや間違い探しなど、バリエーション豊かな問題に挑戦できます。',
      path: url.pathname,
      breadcrumbs: [{ name: 'クイズ一覧', url: url.pathname }]
    });

    return { quizzes, seo };
  } catch (error) {
    console.error('[quiz/+page.server] Error fetching quizzes:', error);
    return {
      quizzes: [],
      seo: createPageSeo({
        title: 'クイズ一覧',
        description:
          '脳トレ日和で公開中のクイズ一覧です。マッチ棒クイズや間違い探しなど、バリエーション豊かな問題に挑戦できます。',
        path: url.pathname,
        breadcrumbs: [{ name: 'クイズ一覧', url: url.pathname }]
      })
    };
  }
};
