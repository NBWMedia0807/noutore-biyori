import { error, redirect } from '@sveltejs/kit';
import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { createSlugContext, findQuizDocument } from '$lib/server/quiz.js';

export const prerender = false;
export const ssr = true;
export const config = { runtime: 'nodejs22.x' };

const Q = /* groq */ `*[_type == "quiz" && slug.current == $slug && !(_id in path("drafts.**"))][0]{
  _id,
  title,
  "slug": slug.current,
  category->{ title, "slug": slug.current },
  answerImage{ asset->{ url, metadata } },
  answerExplanation,
  closingMessage
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
  setHeaders({ 'Cache-Control': 'public, max-age=60, s-maxage=300' });

  let related = [];
  let popular = [];
  if (!shouldSkipSanityFetch()) {
    try {
      const payload = await client.fetch(RELATED_QUERY, {
        slug: quiz.slug,
        categorySlug: quiz.category?.slug ?? null
      });
      related = Array.isArray(payload?.sameCategory)
        ? payload.sameCategory.map(toPreview).filter(Boolean)
        : [];
      popular = Array.isArray(payload?.popular) ? payload.popular.map(toPreview).filter(Boolean) : [];
    } catch (relatedError) {
      console.error('[quiz/[...slug]/answer] failed to fetch related quizzes', relatedError);
    }
  }

  const filteredRelated = related.filter((item) => item.slug !== quiz.slug);
  const filteredPopular = popular.filter((item) => item.slug !== quiz.slug);
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

  return {
    quiz,
    related: mergedRelated,
    ui: {
      showHeader: true,
      hideGlobalNavTabs: true,
      hideBreadcrumbs: true
    },
    seo: {
      canonical: `/quiz/${quiz.slug}/answer`
    }
  };
}
