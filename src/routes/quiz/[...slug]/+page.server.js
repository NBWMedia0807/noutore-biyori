import { error, redirect } from '@sveltejs/kit';
import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { createSlugContext, findQuizDocument } from '$lib/server/quiz.js';
import { createPageSeo, portableTextToPlain } from '$lib/seo.js';
import { SITE } from '$lib/config/site.js';

export const prerender = false;
export const ssr = true;
export const config = { runtime: 'nodejs22.x' };

const Q = /* groq */ `*[_type == "quiz" && slug.current == $slug && !(_id in path("drafts.**"))][0]{
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

const RELATED_QUERY = /* groq */ `{
  "sameCategory": *[
    _type == "quiz"
    && defined(slug.current)
    && !(_id in path("drafts.**"))
    && slug.current != $slug
    && $categorySlug != null
    && defined(category._ref)
    && category->slug.current == $categorySlug
    && (!defined(publishedAt) || publishedAt <= now())
  ] | order(coalesce(publishedAt, _createdAt) desc)[0...6]{
    _id,
    title,
    "slug": slug.current,
    category->{ title, "slug": slug.current },
    mainImage{ asset->{ url, metadata } },
    problemImage{ asset->{ url, metadata } },
    publishedAt,
    _createdAt
  },
  "popular": *[
    _type == "quiz"
    && defined(slug.current)
    && !(_id in path("drafts.**"))
    && (!defined(publishedAt) || publishedAt <= now())
  ] | order(
    coalesce(popularityScore, viewCount, totalViews, impressions, 0) desc,
    coalesce(publishedAt, _createdAt) desc
  )[0...8]{
    _id,
    title,
    "slug": slug.current,
    category->{ title, "slug": slug.current },
    mainImage{ asset->{ url, metadata } },
    problemImage{ asset->{ url, metadata } },
    publishedAt,
    _createdAt
  }
}`;

const pickImage = (quiz) =>
  quiz?.problemImage?.asset?.url
    ? quiz.problemImage
    : quiz?.mainImage?.asset?.url
      ? quiz.mainImage
      : null;

const toPreview = (quiz) => {
  if (!quiz?.slug) return null;
  const image = pickImage(quiz);
  const publishedAt = quiz?.publishedAt ?? quiz?._createdAt;
  return {
    id: quiz._id ?? quiz.slug,
    title: quiz.title ?? '脳トレ問題',
    slug: quiz.slug,
    category: quiz.category ?? null,
    image,
    publishedAt,
    createdAt: quiz?._createdAt
  };
};

const buildSeo = ({ doc, path }) => {
  const plainBody = portableTextToPlain(doc?.body);
  const plainProblem = portableTextToPlain(doc?.problemDescription);
  const description = (plainBody || plainProblem || '').trim() || SITE.description;
  const image = doc?.problemImage?.asset?.url || doc?.mainImage?.asset?.url;
  const publishedAt = doc?.publishedAt ?? doc?._createdAt;
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
  if (typeof doc.slug === 'string' && doc.slug !== slug) {
    throw redirect(308, `/quiz/${doc.slug}`);
  }
  setHeaders({ 'Cache-Control': 'public, max-age=60, s-maxage=300' });

  let related = [];
  let popular = [];
  if (!shouldSkipSanityFetch()) {
    try {
      const payload = await client.fetch(RELATED_QUERY, {
        slug: doc.slug,
        categorySlug: doc.category?.slug ?? null
      });
      related = Array.isArray(payload?.sameCategory)
        ? payload.sameCategory.map(toPreview).filter(Boolean)
        : [];
      popular = Array.isArray(payload?.popular) ? payload.popular.map(toPreview).filter(Boolean) : [];
    } catch (relatedError) {
      console.error('[quiz/[...slug]] failed to fetch related quizzes', relatedError);
    }
  }

codex/implement-code-improvements-for-adsense-review-cyn3si

codex/implement-code-improvements-for-adsense-review-3ewrjj
main
  const filteredRelated = related.filter((item) => item.slug !== doc.slug);
  const filteredPopular = popular.filter((item) => item.slug !== doc.slug);
  const mergedRelated = filteredRelated.slice(0, 6);

  if (mergedRelated.length < 6 && filteredPopular.length) {
    const seen = new Set(mergedRelated.map((item) => item.slug));
    for (const item of filteredPopular) {
      if (mergedRelated.length >= 6) break;
      if (seen.has(item.slug)) continue;
      mergedRelated.push(item);
      seen.add(item.slug);
    }
  }

codex/implement-code-improvements-for-adsense-review-cyn3si

  const filteredRelated = related.filter((item) => item.slug !== doc.slug).slice(0, 3);
  const filteredPopular = popular.filter((item) => item.slug !== doc.slug).slice(0, 5);
  const mergedRelatedSlugs = new Set(filteredRelated.map((item) => item.slug));
  const popularWithoutDuplicates = filteredPopular.filter((item) => !mergedRelatedSlugs.has(item.slug)).slice(0, 2);
main

main
  const path = `/quiz/${doc.slug}`;
  const breadcrumbs = [];
  if (doc?.category?.title && doc?.category?.slug) {
    breadcrumbs.push({
      name: doc.category.title,
      url: `/category/${doc.category.slug}`
    });
  }
  breadcrumbs.push({ name: doc?.title ?? 'クイズ', url: path });

  return {
    doc,
codex/implement-code-improvements-for-adsense-review-cyn3si
    related: mergedRelated,

codex/implement-code-improvements-for-adsense-review-3ewrjj
    related: mergedRelated,

    related: filteredRelated,
    popular: popularWithoutDuplicates,
main

    breadcrumbs,
    ui: {
      showHeader: true,
      hideGlobalNavTabs: true,
      hideBreadcrumbs: false
    },
    seo: buildSeo({ doc, path })
  };
}
