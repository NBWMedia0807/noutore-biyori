import { error } from '@sveltejs/kit';
import { client, urlFor, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { createSlugQueryPayload, mergeSlugCandidateLists } from '$lib/utils/slug.js';
import { SITE } from '$lib/config/site.js';
import { createPageSeo, portableTextToPlain } from '$lib/seo.js';

export const prerender = false;

const QUIZ_SLUGS_QUERY = /* groq */ `
*[_type == "quiz" && defined(slug.current)]{
  _id,
  "slug": slug.current
}`;

const QUERY = /* groq */ `
*[_type=='quiz' && (
  slug.current in $slugCandidates ||
  lower(slug.current) in $lowerSlugCandidates ||
  _id in $slugCandidates
)][0]{
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
      if (!candidateSlug) continue;
      const { candidates: entryCandidates, lowerCandidates: entryLowerCandidates } = createSlugQueryPayload(
        candidateSlug
      );
      const hasDirectOverlap = entryCandidates.some((value) => slugCandidateSet.has(value));
      const hasLowerOverlap = entryLowerCandidates.some((value) => lowerCandidateSet.has(value));
      if (hasDirectOverlap || hasLowerOverlap) {
        return { slug: candidateSlug, id: entry?._id };
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
    let doc = await client.fetch(QUERY, {
      slugCandidates,
      lowerSlugCandidates
    });

    if (!doc) {
      const resolved = await resolveSlugFromCatalog(slugCandidates, lowerSlugCandidates);
      if (resolved?.slug) {
        const resolvedPayload = createSlugQueryPayload(resolved.slug);
        const nextSlugCandidates = mergeSlugCandidateLists(
          slugCandidates,
          resolvedPayload.candidates,
          [resolved.slug],
          resolved?.id ? [resolved.id] : []
        );
        const nextLowerCandidates = mergeSlugCandidateLists(
          lowerSlugCandidates,
          resolvedPayload.lowerCandidates
        );

        doc = await client.fetch(QUERY, {
          slugCandidates: nextSlugCandidates,
          lowerSlugCandidates: nextLowerCandidates
        });
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
