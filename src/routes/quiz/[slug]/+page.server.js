import { error } from '@sveltejs/kit';
import { client, urlFor, shouldSkipSanityFetch, sanityEnv } from '$lib/sanity.server.js';
import { createSlugQueryPayload } from '$lib/utils/slug.js';
import { SITE } from '$lib/config/site.js';
import { createPageSeo, portableTextToPlain } from '$lib/seo.js';

export const prerender = false;
export const config = { runtime: 'node' };

const QUIZ_SLUGS_QUERY = /* groq */ `
*[_type == "quiz" && defined(slug.current) && !(_id in path("drafts.**"))]{
  _id,
  "slug": slug.current
}`;

const QUIZ_BY_SLUG_QUERY = /* groq */ `
*[_type == "quiz" && slug.current == $slug && !(_id in path("drafts.**"))][0]{
  _id,
  _createdAt,
  _updatedAt,
  title,
  "slug": slug.current,
  category->{ title, "slug": slug.current },
  mainImage{
    ...,
    asset->{ url, metadata }
  },
  problemImage{
    ...,
    asset->{ url, metadata }
  },
  problemDescription,
  "hints": select(
    defined(hints) => hints,
    defined(hint) => [hint],
    []
  ),
  adCode1,
  adCode2
}`;

const fetchQuizBySlug = async (slug) => {
  if (!slug) return null;
  try {
    return await client.fetch(QUIZ_BY_SLUG_QUERY, { slug });
  } catch (err) {
    console.error(`[quiz slug:${slug}] Failed to fetch quiz by slug`, err);
    return null;
  }
};

const resolveSlugFromCatalog = async (slugCandidates, lowerSlugCandidates) => {
  try {
    const catalog = await client.fetch(QUIZ_SLUGS_QUERY);
    if (!Array.isArray(catalog) || catalog.length === 0) {
      return null;
    }

    const slugCandidateSet = new Set(slugCandidates);
    const lowerCandidateSet = new Set(lowerSlugCandidates);

    for (const entry of catalog) {
      const candidateSlug = entry?.slug;
      const candidateId = entry?._id;
      if (candidateId && slugCandidateSet.has(candidateId)) {
        return candidateSlug ?? null;
      }

      if (typeof candidateSlug !== 'string' || candidateSlug.length === 0) continue;

      const { candidates: entryCandidates, lowerCandidates: entryLowerCandidates } =
        createSlugQueryPayload(candidateSlug);
      const hasDirectOverlap = entryCandidates.some((value) => slugCandidateSet.has(value));
      const hasLowerOverlap = entryLowerCandidates.some((value) => lowerCandidateSet.has(value));
      if (hasDirectOverlap || hasLowerOverlap) {
        return candidateSlug;
      }
    }
  } catch (fallbackError) {
    console.error('[quiz slug] Failed to resolve slug from catalog', fallbackError);
  }

  return null;
};

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
  const rawSlug = params.slug ?? '';
  const normalizedSlug = decodeURIComponent(rawSlug ?? '');
  const { candidates: slugCandidates, lowerCandidates: lowerSlugCandidates } =
    createSlugQueryPayload(normalizedSlug);
  const primarySlug = slugCandidates[0] ?? '';

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
    let doc = await fetchQuizBySlug(primarySlug);

    if (!doc) {
      const resolvedSlug = await resolveSlugFromCatalog(slugCandidates, lowerSlugCandidates);
      if (resolvedSlug && resolvedSlug !== primarySlug) {
        doc = await fetchQuizBySlug(resolvedSlug);
      }
    }

    if (!doc) {
      console.warn('[quiz/[slug]] 0件', { slugCandidates });
      throw error(404, 'Not found');
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

    console.info('[quiz/[slug]] OK', { slug: doc.slug, source: doc._id, dataSource: 'sanity' });

    return { quiz: doc, breadcrumbs, seo, __dataSource: 'sanity' };
  } catch (err) {
    if (err?.status === 404) {
      throw err;
    }
    console.error(`[quiz/${rawSlug}] ERR`, err);
    return buildFallback(primarySlug, url.pathname);
  }
};
