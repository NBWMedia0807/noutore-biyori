import { error, redirect } from '@sveltejs/kit';
import { createSlugContext, findQuizDocument } from '$lib/server/quiz.js';
import { fetchRelatedQuizzes } from '$lib/server/related-quizzes.js';
import { QUIZ_PUBLISHED_FILTER } from '$lib/queries/quizVisibility.js';
import { createPageSeo, portableTextToPlain, resolveQuizOgImage } from '$lib/seo.js';
import { SITE } from '$lib/config/site.js';
import { resolvePublishedDate } from '$lib/utils/publishedDate.js';
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
  problemImage{ asset->{ url, metadata } },
  mainImage{ asset->{ url, metadata } },
  answerExplanation,
  closingMessage,
  publishedAt,
  _createdAt,
  _updatedAt
}`;

// ▼ 追加: 「さらにもう一問」用のクエリ
const nextChallengeQuery = /* groq */ `*[_type == "quiz" && defined(slug.current) && slug.current != $slug && category._ref == $categoryId${QUIZ_PUBLISHED_FILTER}] | order(publishedAt desc)[0...3]{
  title,
  "slug": slug.current,
  category->{ title, "slug": slug.current },
  "image": problemImage.asset->url
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

  // SEOデータの生成
  const quizPath = `/quiz/${quiz.slug}`;
  const answerPath = `${quizPath}/answer`;
  const plainAnswer = portableTextToPlain(quiz?.answerExplanation);
  const plainClosing = portableTextToPlain(quiz?.closingMessage);
  const seoDescription = (plainAnswer || plainClosing || '').trim() || `${quiz.title}の正解と解説。`;
  const seoImage = resolveQuizOgImage(quiz);
  const publishedAt = resolvePublishedDate(quiz, quiz?._id ?? quiz?.slug ?? answerPath);

  const breadcrumbs = [];
  if (quiz.category?.title && quiz.category?.slug) {
    breadcrumbs.push({ name: quiz.category.title, url: `/category/${quiz.category.slug}` });
  }
  breadcrumbs.push({ name: quiz.title ?? 'クイズ', url: quizPath });
  breadcrumbs.push({ name: '正解', url: answerPath });

  // FAQPage構造化データ（Google検索でFAQリッチスニペット表示の可能性を高める）
  const faqAnswerText = (plainAnswer || plainClosing || `${quiz.title}の正解と解説。`).trim();
  const faqSchema = {
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: quiz.title,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faqAnswerText
        }
      }
    ]
  };

  const seo = createPageSeo({
    title: `${quiz.title}｜正解`,
    description: seoDescription,
    path: answerPath,
    type: 'article',
    image: seoImage,
    breadcrumbs,
    article: {
      title: `${quiz.title}｜正解`,
      datePublished: publishedAt,
      dateModified: quiz._updatedAt ?? publishedAt,
      authorName: SITE.organization.name,
      category: quiz.category?.title
    },
    additionalJsonLd: [faqSchema]
  });

  return {
    quiz,
    related,
    nextChallengePosts,
    ui: {
      showHeader: true,
      hideGlobalNavTabs: true,
      hideBreadcrumbs: true,
      mainClass: 'main--flush'
    },
    seo
  };
}
