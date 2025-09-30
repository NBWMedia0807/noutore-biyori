import { error } from '@sveltejs/kit';
import { urlFor, shouldSkipSanityFetch, sanityEnv } from '$lib/sanity.server.js';
import { SITE } from '$lib/config/site.js';
import { createPageSeo, portableTextToPlain } from '$lib/seo.js';
import { createSlugContext, findQuizDocument, QUIZ_ANSWER_QUERY } from '$lib/server/quiz.js';

export const prerender = false;
export const config = { runtime: 'nodejs22.x' };

const buildFallback = (slug, path) => {
  const fallbackSlug = slug ?? '';
  const fallbackTitle = fallbackSlug ? fallbackSlug.replace(/-/g, ' ') : 'クイズ';
  const breadcrumbs = [
    { name: 'クイズ一覧', url: '/quiz' },
    { name: fallbackTitle, url: `/quiz/${fallbackSlug}` },
    { name: `${fallbackTitle} 正解`, url: path }
  ];

  const description = `${fallbackTitle}の正解と解説をご紹介します。`;
  const seo = {
    ...createPageSeo({
      title: `${fallbackTitle} 正解`,
      description,
      path,
      type: 'article',
      image: SITE.defaultOgImage,
      breadcrumbs,
      article: {
        title: `${fallbackTitle} 正解`,
        authorName: SITE.organization.name,
        category: 'クイズ解説'
      }
    }),
    imageAlt: `${fallbackTitle}の正解`
  };

  return {
    quiz: {
      title: fallbackTitle,
      slug: fallbackSlug,
      category: null,
      answerImage: null,
      answerExplanation: '',
      closingMessage: '',
      adCode1: '',
      adCode2: ''
    },
    breadcrumbs,
    seo,
    __dataSource: 'fallback'
  };
};

export const load = async (event) => {
  const { params, setHeaders, url, isDataRequest } = event;
  const slugContext = createSlugContext(params.slug ?? '');
  const { rawSlug, normalizedSlug, slugCandidates, primarySlug } = slugContext;
  const logPrefix = 'quiz/[slug]/answer';

  console.info('[quiz/[slug]/answer] IN', {
    slug: rawSlug,
    normalizedSlug,
    env: sanityEnv
  });

  if (!isDataRequest) {
    setHeaders({ 'cache-control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400' });
  }

  if (!slugCandidates.length) {
    console.warn('[quiz/[slug]/answer] 0 candidates', { rawSlug });
    return buildFallback('', url.pathname);
  }

  if (shouldSkipSanityFetch()) {
    console.warn('[quiz/[slug]/answer] SKIP_SANITY active; using fallback', { slug: primarySlug });
    return buildFallback(primarySlug, url.pathname);
  }

  try {
    const { doc, resolvedSlug } = await findQuizDocument({
      slugContext,
      query: QUIZ_ANSWER_QUERY,
      logPrefix
    });

    if (!doc) {
      console.warn('[quiz/[slug]/answer] 0件', { slugCandidates });
      throw error(404, 'Not found');
    }

    if (resolvedSlug && resolvedSlug !== primarySlug) {
      console.info('[quiz/[slug]/answer] resolved via catalog', { primarySlug, resolvedSlug });
    }

    const explanation = portableTextToPlain(doc.answerExplanation);
    const descriptionBase = explanation || `${doc.title}の正解と解説をご紹介します。`;
    const description = descriptionBase.length > 120 ? `${descriptionBase.slice(0, 117)}…` : descriptionBase;

    const breadcrumbs = [{ name: 'クイズ一覧', url: '/quiz' }];
    breadcrumbs.push({ name: doc.title, url: `/quiz/${doc.slug}` });
    breadcrumbs.push({ name: `${doc.title} 正解`, url: url.pathname });

    const OG_IMAGE_WIDTH = 1200;
    const OG_IMAGE_HEIGHT = 630;
    let resolvedImage = null;
    if (doc.answerImage) {
      try {
        resolvedImage = urlFor(doc.answerImage).width(OG_IMAGE_WIDTH).height(OG_IMAGE_HEIGHT).fit('crop').auto('format').url();
      } catch (err) {
        console.error('[quiz/[slug]/answer] failed to build og:image URL', err);
      }
    }

    const seo = {
      ...createPageSeo({
        title: `${doc.title} 正解`,
        description,
        path: url.pathname,
        type: 'article',
        image: resolvedImage ?? SITE.defaultOgImage,
        imageWidth: resolvedImage ? OG_IMAGE_WIDTH : undefined,
        imageHeight: resolvedImage ? OG_IMAGE_HEIGHT : undefined,
        breadcrumbs,
        article: {
          title: `${doc.title} 正解`,
          datePublished: doc._createdAt,
          dateModified: doc._updatedAt ?? doc._createdAt,
          authorName: SITE.organization.name,
          category: doc.category?.title ?? 'クイズ解説'
        }
      }),
      imageAlt: `${doc.title}の正解`
    };

    console.info('[quiz/[slug]/answer] OK', {
      slug: doc.slug,
      dataSource: 'sanity',
      resolvedSlug: resolvedSlug ?? primarySlug
    });

    return { quiz: doc, breadcrumbs, seo, __dataSource: 'sanity' };
  } catch (err) {
    if (err?.status === 404) {
      throw err;
    }
    console.error(`[quiz/${rawSlug}/answer] ERR`, err);
    return buildFallback(primarySlug, url.pathname);
  }
};
