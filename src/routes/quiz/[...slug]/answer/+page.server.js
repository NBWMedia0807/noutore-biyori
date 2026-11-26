import { redirect } from '@sveltejs/kit';
import { createSlugContext, findQuizDocument } from '$lib/server/quiz.js';
import { fetchRelatedQuizzes } from '$lib/server/related-quizzes.js';
import { QUIZ_PUBLISHED_FIELD, QUIZ_PUBLISHED_FILTER } from '$lib/queries/quizVisibility.js';
import { throwGoneOrNotFound } from '$lib/server/retracted.js';
import { createPageSeo, portableTextToPlain, resolveQuizOgImage } from '$lib/seo.js';
import { SITE } from '$lib/config/site.js';
import { resolvePublishedDate } from '$lib/utils/publishedDate.js';
import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { getQuizStubQuizzesByCategory, isQuizStubEnabled } from '$lib/server/quiz-stub.js';
import { normalizeChallengePublishedAt, selectNextChallenge } from '$lib/utils/nextChallenge.js';

export const prerender = false;
export const ssr = true;
export const config = { runtime: 'nodejs22.x' };

const Q = /* groq */ `*[_type == "quiz" && slug.current == $slug${QUIZ_PUBLISHED_FILTER}][0]{
  _id,
  title,
  quizType,
  "slug": slug.current,
  "categoryId": category._ref,
  category->{ title, "slug": slug.current },
  answerImage{ asset->{ _id, url, metadata } },
  problemImage{ asset->{ url, metadata } },
  mainImage{ asset->{ url, metadata } },
  answerExplanation,
  closingMessage,
  publishedAt,
  _createdAt,
  _updatedAt
}`;

const publishedTime = `dateTime(select(length(${QUIZ_PUBLISHED_FIELD}) == 10 => ${QUIZ_PUBLISHED_FIELD} + "T00:00:00Z", ${QUIZ_PUBLISHED_FIELD}))`;
const candidateFilter = /* groq */ `_type == "quiz" && defined(slug.current)
  && slug.current != $slug && category._ref == $categoryId
  ${QUIZ_PUBLISHED_FILTER}
  && !(_id in path("drafts.**")) && ${publishedTime} <= dateTime(now())
  && isRepublished != true`;
const candidateFields = /* groq */ `{
  title,
  "slug": slug.current,
  category->{ title, "slug": slug.current },
  "publishedAt": ${QUIZ_PUBLISHED_FIELD}
}`;
const nextChallengeQuery = /* groq */ `{
  "newer": *[${candidateFilter} && ${publishedTime} > dateTime($publishedAt)]
    | order(${publishedTime} asc, slug.current asc)[0]${candidateFields},
  "older": *[${candidateFilter} && ${publishedTime} < dateTime($publishedAt)]
    | order(${publishedTime} desc, slug.current asc)[0]${candidateFields}
}`;

const arithmeticLinksQuery = /* groq */ `*[
  ${candidateFilter}
  && (quizType == "arithmetic" || !defined(quizType))
] | order(${publishedTime} desc, slug.current asc)[0...8]{
  title, "slug": slug.current
}`;

const calculationOrderTitle =
  /計算の順[番序]|かっこ|カッコ|括弧|ど(?:れ|ちら|っち)を先に計算|(?:何|どこ)から計算/;

async function fetchArithmeticLinks(quiz) {
  const category = quiz.category;
  if (category?.slug !== 'arithmetic-quiz' || (quiz.quizType != null && quiz.quizType !== 'arithmetic')) {
    return [];
  }

  try {
    let candidates;
    if (isQuizStubEnabled()) {
      const now = Date.now();
      candidates = getQuizStubQuizzesByCategory(category.slug)
        .filter((candidate) =>
          candidate.slug !== quiz.slug &&
          (candidate.quizType == null || candidate.quizType === 'arithmetic') &&
          candidate.isRepublished !== true &&
          !candidate._id.startsWith('drafts.') &&
          (candidate.reviewStatus == null || candidate.reviewStatus === 'approved') &&
          Date.parse(normalizeChallengePublishedAt(candidate)) <= now
        )
        .sort((a, b) => Date.parse(normalizeChallengePublishedAt(b)) - Date.parse(normalizeChallengePublishedAt(a)))
        .slice(0, 8);
    } else {
      if (shouldSkipSanityFetch() || !quiz.categoryId) return [];
      candidates = await client.fetch(arithmeticLinksQuery, { slug: quiz.slug, categoryId: quiz.categoryId });
    }

    const links = candidates.map(({ title, slug }) => ({ title, slug, category }));
    if (calculationOrderTitle.test(quiz.title)) {
      const sameType = links.filter(({ title }) => calculationOrderTitle.test(title));
      if (sameType.length >= 3) return sameType.slice(0, 5);
      const fallback = links.filter(({ title }) => !calculationOrderTitle.test(title));
      return [...sameType, ...fallback].slice(0, 5);
    }
    return links.slice(0, 5);
  } catch {
    return [];
  }
}

async function fetchNextChallenge(quiz) {
  if (isQuizStubEnabled() || shouldSkipSanityFetch()) {
    return selectNextChallenge(quiz, getQuizStubQuizzesByCategory(quiz.category?.slug), Date.now());
  }

  if (!quiz.categoryId || !quiz.category?.slug) return null;
  const publishedAt = normalizeChallengePublishedAt(quiz);
  if (!publishedAt) return null;

  const { newer, older } = await client.fetch(nextChallengeQuery, {
    slug: quiz.slug,
    categoryId: quiz.categoryId,
    publishedAt,
  });
  return selectNextChallenge(quiz, [newer, older], Date.now());
}

export async function load({ params, setHeaders }) {
  const slugSegments = Array.isArray(params.slug) ? params.slug : [params.slug];
  const slug = slugSegments.join('/');
  const slugContext = createSlugContext(slug);
  const { doc: quiz } = await findQuizDocument({
    slugContext,
    query: Q,
    logPrefix: 'quiz/[...slug]/answer'
  });
  // 非公開化された記事は 410 Gone、本当に存在しない場合のみ 404
  if (!quiz) await throwGoneOrNotFound(slug);
  if (typeof quiz.slug === 'string' && quiz.slug !== slug) {
    throw redirect(308, `/quiz/${quiz.slug}/answer`);
  }

  const [related, nextChallenge, arithmeticLinks] = await Promise.all([
    fetchRelatedQuizzes({
      slug: quiz.slug,
      categorySlug: quiz.category?.slug ?? null
    }),
    fetchNextChallenge(quiz),
    fetchArithmeticLinks(quiz),
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
    nextChallenge,
    arithmeticLinks,
    ui: {
      showHeader: true,
      hideGlobalNavTabs: true,
      hideBreadcrumbs: true,
      mainClass: 'main--flush'
    },
    seo
  };
}
