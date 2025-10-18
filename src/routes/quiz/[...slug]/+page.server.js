import { env } from '$env/dynamic/private';
import { error, redirect } from '@sveltejs/kit';
import { createSlugContext, findQuizDocument } from '$lib/server/quiz.js';
import { createPageSeo, portableTextToPlain, resolveQuizOgImage } from '$lib/seo.js';
import { SITE } from '$lib/config/site.js';
import { fetchRelatedQuizzes } from '$lib/server/related-quizzes.js';
import { QUIZ_PUBLISHED_FILTER } from '$lib/queries/quizVisibility.js';
import { ensurePublishedAt, resolvePublishedDate } from '$lib/utils/publishedDate.js';

export const prerender = false;
export const ssr = true;
const quizBypassToken = env.VERCEL_REVALIDATE_TOKEN || env.SANITY_REVALIDATE_SECRET;
const quizIsrConfig = { expiration: false };
if (quizBypassToken) {
  quizIsrConfig.bypassToken = quizBypassToken;
}

export const config = { runtime: 'nodejs22.x', isr: quizIsrConfig };

const Q = /* groq */ `*[
  _type == "quiz"
  && slug.current == $slug
  ${QUIZ_PUBLISHED_FILTER}
][0]{
  _id,
  title,
  "slug": slug.current,
  category->{ _id, title, "slug": slug.current },
  "problemImage": select(
    defined(problemImage) => problemImage,
    defined(questionImage) => questionImage,
    defined(mainImage) => mainImage,
    null
  ){ asset->{ url, metadata } },
  mainImage{
    ...,
    asset->{ url, metadata }
  },
  hint,
  hints,
  body,
  problemDescription,
  closingMessage,
  answerImage{ asset->{ url, metadata } },
  answerExplanation,
  publishedAt,
  _createdAt,
  _updatedAt
}`;

const buildSeo = ({ doc, path }) => {
  const plainBody = portableTextToPlain(doc?.body);
  const plainProblem = portableTextToPlain(doc?.problemDescription);
  const description = (plainBody || plainProblem || '').trim() || SITE.description;
  const image = resolveQuizOgImage(doc);
  const publishedAt = resolvePublishedDate(doc, doc?._id ?? doc?.slug ?? path);
  const modifiedAt = doc?._updatedAt ?? publishedAt;
  const breadcrumbs = [];
  if (doc?.category?.title && doc?.category?.slug) {
    breadcrumbs.push({
      name: doc.category.title,
      url: `/category/${doc.category.slug}`
    });
  }
  breadcrumbs.push({ name: doc?.title ?? 'クイズ', url: path });

  return createPageSeo({
    title: doc?.title ?? '脳トレ問題',
    description,
    path,
    type: 'article',
    image,
    breadcrumbs,
    article: {
      title: doc?.title ?? SITE.name,
      datePublished: publishedAt,
      dateModified: modifiedAt,
      authorName: SITE.organization.name,
      category: doc?.category?.title
    }
  });
};

export async function load({ params, setHeaders }) {
  const slugSegments = Array.isArray(params.slug) ? params.slug : [params.slug];
  const slug = slugSegments.join('/');
  const slugContext = createSlugContext(slug);
  const { doc } = await findQuizDocument({
    slugContext,
    query: Q,
    logPrefix: 'quiz/[...slug]'
  });
  if (!doc) throw error(404, `Quiz not found: ${slug}`);
  const normalizedDoc = ensurePublishedAt(doc, doc?._id ?? slug);
  if (typeof normalizedDoc.slug === 'string' && normalizedDoc.slug !== slug) {
    throw redirect(308, `/quiz/${normalizedDoc.slug}`);
  }

  setHeaders({ 'Cache-Control': 'public, max-age=60, s-maxage=300' });

  const path = `/quiz/${normalizedDoc.slug}`;
  const breadcrumbs = [];
  if (normalizedDoc?.category?.title && normalizedDoc?.category?.slug) {
    breadcrumbs.push({
      name: normalizedDoc.category.title,
      url: `/category/${normalizedDoc.category.slug}`
    });
  }
  breadcrumbs.push({ name: normalizedDoc?.title ?? 'クイズ', url: path });

  const related = await fetchRelatedQuizzes({
    slug: normalizedDoc.slug,
    categorySlug: normalizedDoc.category?.slug ?? null
  });

  const nextQuiz = related?.[0] ?? null;

  return {
    doc: normalizedDoc,
    related,
    nextQuiz,
    breadcrumbs,
    ui: {
      showHeader: true,
      hideGlobalNavTabs: true,
      hideBreadcrumbs: true,
      mainClass: 'main--flush'
    },
    seo: buildSeo({ doc: normalizedDoc, path })
  };
}
