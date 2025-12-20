import { error, redirect } from '@sveltejs/kit';
import { createSlugContext, findQuizDocument } from '$lib/server/quiz.js';
import { fetchRelatedQuizzes } from '$lib/server/related-quizzes.js';
import { QUIZ_PUBLISHED_FILTER } from '$lib/queries/quizVisibility.js';
// ▼ 修正済み: 正しいインポート
import { client } from '$lib/sanity/client.js';

export const prerender = false;
export const ssr = true;
export const config = { runtime: 'nodejs22.x' };

const Q = /* groq */ `*[_type == "quiz" && slug.current == $slug${QUIZ_PUBLISHED_FILTER}][0]{
  _id,
  title,
  "slug": slug.current,
  "categoryId": category._ref,
  category->{ title, "slug": slug.current },
  answerImage{ asset->{ url, metadata } },
  answerExplanation,
  closingMessage
}`;

// ▼ 追加: 「さらにもう一問」用のクエリ
const nextChallengeQuery = /* groq */ `*[_type == "quiz" && slug.current != $slug && category._ref == $categoryId${QUIZ_PUBLISHED_FILTER}] | order(publishedAt desc)[0...3]{
  title,
  "slug": slug.current,
  category->{ title, "slug": slug.current },
  "image": coalesce(mainImage.asset->url, answerImage.asset->url)
}`;

export async function load({ params, setHeaders }) {
  const slugSegments = Array.isArray(params.slug) ? params.slug : [params.slug];
  const slug = slugSegments.join('/');
  const slugContext = createSlugContext(slug);
  const { doc: quiz } = await findQuizDocument({
    slugContext,
    query: Q,
    logPrefix: 'quiz/[...slug]/answer'
  });
  if (!quiz) throw error(404, 'Answer not found');
  if (typeof quiz.slug === 'string' && quiz.slug !== slug) {
    throw redirect(308, `/quiz/${quiz.slug}/answer`);
  }

  // ▼ 修正: 並行してデータ取得
  const [related, nextChallengePosts] = await Promise.all([
    fetchRelatedQuizzes({
      slug: quiz.slug,
      categorySlug: quiz.category?.slug ?? null
    }),
    quiz.categoryId 
      ? client.fetch(nextChallengeQuery, {
          slug: quiz.slug,
          categoryId: quiz.categoryId
        })
      : Promise.resolve([])
  ]);

  setHeaders({ 'Cache-Control': 'public, max-age=60, s-maxage=300' });

  return {
    quiz,
    related,
    nextChallengePosts, // ▼ UIにデータを渡す
    ui: {
      showHeader: true,
      hideGlobalNavTabs: true,
      hideBreadcrumbs: true,
      mainClass: 'main--flush'
    },
    seo: {
      canonical: `/quiz/${quiz.slug}/answer`
    }
  };
}
