import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { QUIZ_PREVIEW_PROJECTION } from '$lib/queries/quizPreview.js';

const RELATED_QUERY = /* groq */ `{
  "sameCategory": *[
    _type == "quiz"
    && defined(slug.current)
    && slug.current != $slug
    && !(_id in path("drafts.**"))
    && (!defined(publishedAt) || publishedAt <= now())
    && defined(category._ref)
    && category->slug.current == $categorySlug
  ] | order(coalesce(publishedAt, _createdAt) desc)[0...12]{
    ${QUIZ_PREVIEW_PROJECTION}
  },
  "latest": *[
    _type == "quiz"
    && defined(slug.current)
    && slug.current != $slug
    && !(_id in path("drafts.**"))
    && (!defined(publishedAt) || publishedAt <= now())
  ] | order(coalesce(publishedAt, _createdAt) desc)[0...24]{
    ${QUIZ_PREVIEW_PROJECTION}
  }
}`;

const pickImage = (quiz) =>
  quiz?.problemImage?.asset?.url
    ? quiz.problemImage
    : quiz?.mainImage?.asset?.url
      ? quiz.mainImage
      : quiz?.answerImage?.asset?.url
        ? quiz.answerImage
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
    problemImage: quiz.problemImage ?? null,
    mainImage: quiz.mainImage ?? null,
    answerImage: quiz.answerImage ?? null,
    thumbnailUrl: quiz.thumbnailUrl ?? null,
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
    const latest = Array.isArray(payload?.latest) ? payload.latest.map(toPreview).filter(Boolean) : [];

    const seen = new Set();
    const limit = 6;
    const result = [];

    const appendItems = (source) => {
      for (const item of source) {
        if (!item?.slug || seen.has(item.slug) || result.length >= limit) continue;
        seen.add(item.slug);
        result.push(item);
        if (result.length >= limit) break;
      }
    };

    appendItems(sameCategory);
    appendItems(latest);

    return result;
  } catch (error) {
    console.error('[related-quizzes] failed to fetch related quizzes', error);
    return [];
  }
}
