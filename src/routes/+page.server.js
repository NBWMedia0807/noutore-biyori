import { env } from '$env/dynamic/private';
import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { SITE } from '$lib/config/site.js';
import { createPageSeo, resolveOgImageFromQuizzes } from '$lib/seo.js';
import { QUIZ_PREVIEW_PROJECTION } from '$lib/queries/quizPreview.js';
import { QUIZ_ORDER_BY_PUBLISHED, QUIZ_PUBLISHED_FILTER, filterVisibleQuizzes } from '$lib/queries/quizVisibility.js';
import { getQuizStubCatalog, getQuizStubDocument, isQuizStubEnabled } from '$lib/server/quiz-stub.js';

export const prerender = false;
const homeBypassToken = env.VERCEL_REVALIDATE_TOKEN || env.SANITY_REVALIDATE_SECRET;
const homeIsrConfig = { expiration: false };
if (homeBypassToken) {
  homeIsrConfig.bypassToken = homeBypassToken;
}

export const config = { runtime: 'nodejs22.x', isr: homeIsrConfig };

const QUIZZES_QUERY = /* groq */ `
*[
  _type == "quiz"
  && defined(slug.current)
  ${QUIZ_PUBLISHED_FILTER}
] | order(${QUIZ_ORDER_BY_PUBLISHED}) {
  ${QUIZ_PREVIEW_PROJECTION}
}`;

const pickImageSource = (quiz) =>
  quiz?.problemImage?.asset?.url
    ? quiz.problemImage
    : quiz?.mainImage?.asset?.url
      ? quiz.mainImage
      : quiz?.answerImage?.asset?.url
        ? quiz.answerImage
        : null;

const toMetric = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const toPreview = (quiz) => {
  const slug = typeof quiz?.slug === 'string' ? quiz.slug : quiz?.slug?.current;
  if (!slug) return null;
  return {
    id: quiz._id ?? slug,
    title: quiz.title ?? '脳トレ問題',
    slug,
    category: quiz.category ?? null,
    image: pickImageSource(quiz),
    problemImage: quiz.problemImage ?? null,
    mainImage: quiz.mainImage ?? null,
    answerImage: quiz.answerImage ?? null,
    thumbnailUrl: quiz.thumbnailUrl ?? null,
    publishedAt: quiz?.publishedAt ?? quiz?._createdAt ?? null,
    _createdAt: quiz?._createdAt ?? null,
    viewCount: toMetric(quiz?.viewCount),
    likeCount: toMetric(quiz?.likeCount),
    popularityScore: toMetric(quiz?.popularityScore)
  };
};

const sortByPublishedAt = (list) =>
  (Array.isArray(list) ? list : [])
    .map(toPreview)
    .filter(Boolean)
    .sort((a, b) => {
      const aDate = new Date(a?.publishedAt ?? a?._createdAt ?? 0).getTime();
      const bDate = new Date(b?.publishedAt ?? b?._createdAt ?? 0).getTime();
      return bDate - aDate;
    });

const createHomeSeo = (path, quizzes, description = SITE.description) => {
  const ogCandidates = Array.isArray(quizzes) ? quizzes : [];
  const image = resolveOgImageFromQuizzes(ogCandidates, '/logo.svg');
  return createPageSeo({
    title: `${SITE.name}｜${SITE.tagline}`,
    description,
    path,
    image,
    appendSiteName: false
  });
};

const buildStubQuizzes = () => {
  if (!isQuizStubEnabled()) {
    return [];
  }

  try {
    const catalog = getQuizStubCatalog();
    const docs = Array.isArray(catalog)
      ? catalog.map((entry) => (entry?.slug ? getQuizStubDocument(entry.slug) : null)).filter(Boolean)
      : [];
    return sortByPublishedAt(docs);
  } catch (error) {
    console.error('[+page.server] Failed to resolve stub quizzes for home page:', error);
    return [];
  }
};

export const load = async (event) => {
  const { url, setHeaders, isDataRequest } = event;

  if (!isDataRequest) {
    setHeaders({ 'cache-control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400' });
  }

  const path = url.pathname;
  const stubQuizzes = buildStubQuizzes();

  if (shouldSkipSanityFetch()) {
    const quizzes = stubQuizzes;
    return { quizzes, seo: createHomeSeo(path, quizzes) };
  }

  try {
    const result = await client.fetch(QUIZZES_QUERY);
    const quizzes = sortByPublishedAt(filterVisibleQuizzes(result));

    if (quizzes.length === 0 && stubQuizzes.length > 0) {
      const seo = createHomeSeo(path, stubQuizzes);
      return { quizzes: stubQuizzes, seo };
    }

    const seo = createHomeSeo(path, quizzes);
    return { quizzes, seo };
  } catch (error) {
    console.error('[+page.server.js] Failed to load home page data:', error);
    const quizzes = stubQuizzes;
    return { quizzes, seo: createHomeSeo(path, quizzes) };
  }
};
