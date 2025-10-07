import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';

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

export async function fetchRelatedQuizzes({ slug, categorySlug }) {
  if (shouldSkipSanityFetch()) return [];

  try {
    const payload = await client.fetch(RELATED_QUERY, {
      slug,
      categorySlug: categorySlug ?? null
    });
    const sameCategory = Array.isArray(payload?.sameCategory)
      ? payload.sameCategory.map(toPreview).filter(Boolean)
      : [];
    const popular = Array.isArray(payload?.popular)
      ? payload.popular.map(toPreview).filter(Boolean)
      : [];

    const filteredSameCategory = sameCategory.filter((item) => item.slug !== slug);
    const filteredPopular = popular.filter((item) => item.slug !== slug);

    const merged = filteredSameCategory.slice(0, 6);
    const seen = new Set(merged.map((item) => item.slug));

    for (const item of filteredPopular) {
      if (merged.length >= 6) break;
      if (seen.has(item.slug)) continue;
      merged.push(item);
      seen.add(item.slug);
    }

    return merged;
  } catch (error) {
    console.error('[related-quizzes] failed to fetch related quizzes', error);
    return [];
  }
}
