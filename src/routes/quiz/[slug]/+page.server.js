import { error } from '@sveltejs/kit';
import { urlFor, shouldSkipSanityFetch, sanityEnv } from '$lib/sanity.server.js';
import { SITE } from '$lib/config/site.js';
import { createPageSeo, portableTextToPlain } from '$lib/seo.js';
import { createSlugContext, findQuizDocument, QUIZ_DETAIL_QUERY } from '$lib/server/quiz.js';

export const prerender = false;
export const config = { runtime: 'nodejs22.x' };

const buildFallback = (slug, path) => {
  const fallbackSlug = slug ?? '';
  const fallbackTitle = fallbackSlug ? fallbackSlug.replace(/-/g, ' ') : 'クイズ詳細';
  const breadcrumbs = [{ name: 'クイズ一覧', url: '/quiz' }, { name: fallbackTitle, url: path }];
  const description = `${fallbackTitle}のクイズ詳細ページです。`;

  const seo = {
    ...createPageSeo({
      title: fallbackTitle,
      description,
      path,
      type: 'article',
      image: SITE.defaultOgImage,
      breadcrumbs,
      article: {
        title: fallbackTitle,
        authorName: SITE.organization.name,
        category: 'クイズ'
      }
    }),
    imageAlt: fallbackTitle
  };

  return {
    quiz: {
      _id: fallbackSlug || 'quiz',
      title: fallbackTitle,
      slug: fallbackSlug,
      category: null,
      problemImage: null,
      mainImage: null,
      problemDescription: '',
      hints: [],
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
  const logPrefix = 'quiz/[slug]';

  console.info('[quiz/[slug]] IN', {
    slug: rawSlug,
    normalizedSlug,
    env: sanityEnv
  });

  if (!isDataRequest) {
    setHeaders({ 'cache-control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400' });
  }

  if (!slugCandidates.length) {
    console.warn('[quiz/[slug]] 0 candidates', { rawSlug });
    return buildFallback('', url.pathname);
  }

  if (shouldSkipSanityFetch()) {
    console.warn('[quiz/[slug]] SKIP_SANITY active; using fallback', { slug: primarySlug });
    return buildFallback(primarySlug, url.pathname);
  }

  try {
    const { doc, resolvedSlug } = await findQuizDocument({
      slugContext,
      query: QUIZ_DETAIL_QUERY,
      logPrefix
    });

    if (!doc) {
      console.warn('[quiz/[slug]] 0件', { slugCandidates });
      throw error(404, 'Not found');
    }

    if (resolvedSlug && resolvedSlug !== primarySlug) {
      console.info('[quiz/[slug]] resolved via catalog', { primarySlug, resolvedSlug });
    }

    const descriptionSource = portableTextToPlain(doc.problemDescription) || doc.title;
    const description = descriptionSource.length > 120 ? `${descriptionSource.slice(0, 117)}…` : descriptionSource;

    const OG_IMAGE_WIDTH = 1200;
    const OG_IMAGE_HEIGHT = 630;
    let resolvedImage = null;

    const heroImage = doc.problemImage ?? doc.mainImage;
    if (heroImage) {
      try {
        resolvedImage = urlFor(heroImage).width(OG_IMAGE_WIDTH).height(OG_IMAGE_HEIGHT).fit('crop').auto('format').url();
      } catch (err) {
        console.error('[quiz/[slug]] failed to build og:image URL', err);
      }
    }

    const breadcrumbs = [{ name: 'クイズ一覧', url: '/quiz' }];
    if (doc.category?.title && doc.category?.slug) {
      breadcrumbs.push({ name: doc.category.title, url: `/category/${doc.category.slug}` });
    }
    breadcrumbs.push({ name: doc.title, url: url.pathname });

    const seo = {
      ...createPageSeo({
        title: doc.title,
        description,
        path: url.pathname,
        type: 'article',
        image: resolvedImage ?? SITE.defaultOgImage,
        imageWidth: resolvedImage ? OG_IMAGE_WIDTH : undefined,
        imageHeight: resolvedImage ? OG_IMAGE_HEIGHT : undefined,
        breadcrumbs,
        article: {
          title: doc.title,
          datePublished: doc._createdAt,
          dateModified: doc._updatedAt ?? doc._createdAt,
          authorName: SITE.organization.name,
          category: doc.category?.title ?? 'クイズ'
        }
      }),
      imageAlt: doc.title
    };

    console.info('[quiz/[slug]] OK', {
      slug: doc.slug,
      source: doc._id,
      dataSource: 'sanity',
      resolvedSlug: resolvedSlug ?? primarySlug
    });

    return { quiz: doc, breadcrumbs, seo, __dataSource: 'sanity' };
  } catch (err) {
    if (err?.status === 404) {
      throw err;
    }
    console.error(`[quiz/${rawSlug}] ERR`, err);
    return buildFallback(primarySlug, url.pathname);
  }
};
