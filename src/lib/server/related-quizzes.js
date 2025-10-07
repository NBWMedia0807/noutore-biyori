import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';

const RELATED_QUERY = /* groq */ `{
  "popular": *[
    _type == "quiz"
    && defined(slug.current)
    && !(_id in path("drafts.**"))
    && (!defined(publishedAt) || publishedAt <= now())
  ] | order(
    coalesce(popularityScore, recentViewCount, viewCount, totalViews, impressions, 0) desc,
    coalesce(publishedAt, _createdAt) desc
  )[0...18]{
    _id,
    title,
    "slug": slug.current,
    category->{ title, "slug": slug.current },
    mainImage{ asset->{ url, metadata } },
    problemImage{ asset->{ url, metadata } },
    publishedAt,
    _createdAt,
    popularityScore,
    viewCount,
    recentViewCount,
    totalViews,
    impressions
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
  const popularity =
    typeof quiz?.popularityScore === 'number'
      ? quiz.popularityScore
      : typeof quiz?.recentViewCount === 'number'
        ? quiz.recentViewCount
        : typeof quiz?.viewCount === 'number'
          ? quiz.viewCount
          : typeof quiz?.totalViews === 'number'
            ? quiz.totalViews
            : typeof quiz?.impressions === 'number'
              ? quiz.impressions
              : 0;
  return {
    id: quiz._id ?? quiz.slug,
    title: quiz.title ?? '脳トレ問題',
    slug: quiz.slug,
    category: quiz.category ?? null,
    image,
    publishedAt,
    createdAt: quiz?._createdAt,
    popularity
  };
};

export async function fetchRelatedQuizzes({ slug, categorySlug }) {
  if (shouldSkipSanityFetch()) return [];

  try {
    const payload = await client.fetch(RELATED_QUERY, {
      slug,
      categorySlug: categorySlug ?? null
    });
    const popular = Array.isArray(payload?.popular)
      ? payload.popular.map(toPreview).filter(Boolean)
      : [];

    const filteredPopular = popular.filter((item) => item.slug !== slug);

    if (filteredPopular.length === 0) {
      return [];
    }

    const recentThreshold = (() => {
      const date = new Date();
      date.setMonth(date.getMonth() - 3);
      return date;
    })();

    const isRecent = (item) => {
      const published = item?.publishedAt ?? item?.createdAt;
      if (!published) return false;
      const value = new Date(published);
      if (Number.isNaN(value.getTime())) return false;
      return value >= recentThreshold;
    };

    const selectItems = (source, seen, limit) => {
      const results = [];
      for (const item of source) {
        if (results.length >= limit) break;
        if (!item?.slug || seen.has(item.slug)) continue;
        results.push(item);
        seen.add(item.slug);
      }
      return results;
    };

    const sameCategoryPopular = filteredPopular.filter(
      (item) => categorySlug && item?.category?.slug === categorySlug
    );
    const recentPopular = filteredPopular.filter(isRecent);
    const recentSameCategory = sameCategoryPopular.filter(isRecent);

    const seen = new Set();
    const limit = 6;
    const merged = [];

    merged.push(...selectItems(recentSameCategory, seen, limit - merged.length));
    merged.push(...selectItems(recentPopular, seen, limit - merged.length));
    merged.push(...selectItems(sameCategoryPopular, seen, limit - merged.length));
    merged.push(...selectItems(filteredPopular, seen, limit - merged.length));

    return merged.slice(0, limit);
  } catch (error) {
    console.error('[related-quizzes] failed to fetch related quizzes', error);
    return [];
  }
}
