import { env } from '$env/dynamic/private';
import { error, redirect } from '@sveltejs/kit';
import { createSlugContext, findQuizDocument } from '$lib/server/quiz.js';
import { createPageSeo, portableTextToPlain } from '$lib/seo.js';
import { SITE } from '$lib/config/site.js';
import { fetchRelatedQuizzes } from '$lib/server/related-quizzes.js';
import { QUIZ_EFFECTIVE_PUBLISHED_FIELD, QUIZ_PUBLISHED_FILTER } from '$lib/queries/quizVisibility.js';
import { createQuizAnswerTag, createQuizDetailTag } from '$lib/cache/tags.js';

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
  _updatedAt,
  "effectivePublishedAt": ${QUIZ_EFFECTIVE_PUBLISHED_FIELD}
}`;

const buildSeo = ({ doc, path }) => {
  const plainBody = portableTextToPlain(doc?.body);
  const plainProblem = portableTextToPlain(doc?.problemDescription);
  const description = (plainBody || plainProblem || '').trim() || SITE.description;
  const image = doc?.problemImage?.asset?.url || doc?.mainImage?.asset?.url;
codex/investigate-and-fix-article-display-issue-s6ldvy
  const publishedAt = doc?.effectivePublishedAt ?? doc?.publishedAt ?? doc?._createdAt ?? null;

  const publishedAt = doc?.publishedAt ?? doc?._createdAt ?? null;
main
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

export async function load({ params, setHeaders, depends }) {
  const slugSegments = Array.isArray(params.slug) ? params.slug : [params.slug];
  const slug = slugSegments.join('/');
  const slugContext = createSlugContext(slug);
  const { doc } = await findQuizDocument({
    slugContext,
    query: Q,
    logPrefix: 'quiz/[...slug]'
  });
  if (!doc) throw error(404, `Quiz not found: ${slug}`);
codex/investigate-and-fix-article-display-issue-s6ldvy
  const effectivePublishedAt =
    doc?.effectivePublishedAt ?? doc?.publishedAt ?? doc?._createdAt ?? null;
  const normalizedDoc =
    effectivePublishedAt &&
    (doc?.publishedAt !== effectivePublishedAt || doc?.effectivePublishedAt !== effectivePublishedAt)
      ? { ...doc, publishedAt: effectivePublishedAt, effectivePublishedAt }
      : doc?.effectivePublishedAt
        ? doc
        : { ...doc, effectivePublishedAt };

  const effectivePublishedAt = doc?.publishedAt ?? doc?._createdAt ?? null;
  const normalizedDoc =
    effectivePublishedAt && doc?.publishedAt !== effectivePublishedAt
      ? { ...doc, publishedAt: effectivePublishedAt }
      : doc;
main
  if (typeof normalizedDoc.slug === 'string' && normalizedDoc.slug !== slug) {
    throw redirect(308, `/quiz/${normalizedDoc.slug}`);
  }

  depends(createQuizDetailTag(normalizedDoc.slug));
  depends(createQuizAnswerTag(normalizedDoc.slug));

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

  return {
    doc: normalizedDoc,
    related,
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
