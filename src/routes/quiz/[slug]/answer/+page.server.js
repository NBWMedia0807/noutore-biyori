import { error } from '@sveltejs/kit';
import { client, urlFor, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { createSlugQueryPayload } from '$lib/utils/slug.js';
import { SITE } from '$lib/config/site.js';
import { createPageSeo, portableTextToPlain } from '$lib/seo.js';

export const prerender = false;

const QUIZ_SLUGS_QUERY = /* groq */ `
*[_type == "quiz" && defined(slug.current) && !(_id in path("drafts.**"))]{
codex/review-implementation-against-ideal-state-ilxcca
  _id,

main
  "slug": slug.current
}`;

const QUIZ_BY_SLUG_QUERY = /* groq */ `
*[_type=='quiz' && slug.current == $slug && !(_id in path("drafts.**"))][0]{
  title,
  "slug": slug.current,
  category->{ title, "slug": slug.current },
  answerImage{ asset->{ url, metadata } },
  answerExplanation,
  closingMessage,
  adCode1,
  adCode2,
  _createdAt,
  _updatedAt
}`;

const fetchQuizBySlug = async (slug) => {
  if (!slug) return null;
  try {
    return await client.fetch(QUIZ_BY_SLUG_QUERY, { slug });
  } catch (err) {
    console.error(`[quiz answer slug:${slug}] Failed to fetch quiz by slug`, err);
    return null;
  }
};

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

export const entries = async () => {
  if (shouldSkipSanityFetch()) {
    return [];
  }

  try {
    const slugs = await client.fetch(QUIZ_SLUGS_QUERY);
    if (!Array.isArray(slugs)) return [];
    const seen = new Set();
    return slugs
      .map((item) => item?.slug)
      .filter(Boolean)
      .filter((slug) => {
        if (seen.has(slug)) return false;
        seen.add(slug);
        return true;
      })
      .map((slug) => ({ slug }));
  } catch (err) {
    console.error('[quiz answer] Failed to build prerender entries', err);
    return [];
  }
};

const resolveSlugFromCatalog = async (slugCandidates, lowerSlugCandidates) => {
  try {
    const catalog = await client.fetch(QUIZ_SLUGS_QUERY);
    if (!Array.isArray(catalog) || !catalog.length) {
      return null;
    }

    const slugCandidateSet = new Set(slugCandidates);
    const lowerCandidateSet = new Set(lowerSlugCandidates);

    for (const entry of catalog) {
      const candidateSlug = entry?.slug;
codex/review-implementation-against-ideal-state-ilxcca
      const candidateId = entry?._id;
      if (candidateId && slugCandidateSet.has(candidateId)) {
        return candidateSlug ?? null;
      }

      if (typeof candidateSlug !== 'string' || candidateSlug.length === 0) continue;


      if (typeof candidateSlug !== 'string' || candidateSlug.length === 0) continue;
main
      const { candidates: entryCandidates, lowerCandidates: entryLowerCandidates } =
        createSlugQueryPayload(candidateSlug);
      const hasDirectOverlap = entryCandidates.some((value) => slugCandidateSet.has(value));
      const hasLowerOverlap = entryLowerCandidates.some((value) => lowerCandidateSet.has(value));
      if (hasDirectOverlap || hasLowerOverlap) {
        return candidateSlug;
      }
    }
  } catch (fallbackError) {
    console.error('[quiz answer] Failed to resolve slug from catalog', fallbackError);
  }

  return null;
};

export const load = async (event) => {
  const { params, setHeaders, url, isDataRequest } = event;
  const { slug } = params;
  const { candidates: slugCandidates, lowerCandidates: lowerSlugCandidates } = createSlugQueryPayload(slug);
  const primarySlug = slugCandidates[0] ?? '';

  if (!isDataRequest) {
    setHeaders({ 'cache-control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400' });
  }

  if (!slugCandidates.length) {
    return buildFallback('', url.pathname);
  }

  if (shouldSkipSanityFetch()) {
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
      throw error(404, 'Not found');
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
        console.error('[quiz answer] failed to build og:image URL', err);
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

    return { quiz: doc, breadcrumbs, seo, __dataSource: 'sanity' };
  } catch (err) {
    if (err?.status === 404) {
      throw err;
    }
    console.error(`[quiz/${slug}/answer] Sanity fetch failed`, err);
    return buildFallback(primarySlug, url.pathname);
  }
};
