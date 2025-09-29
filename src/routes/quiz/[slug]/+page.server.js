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

const QUIZ_QUERY = /* groq */ `
*[_type == "quiz" && (
  slug.current in $slugCandidates ||
  lower(slug.current) in $lowerSlugCandidates ||
  _id in $slugCandidates
)][0]{
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
    console.error('[quiz slug] Failed to build prerender entries', err);
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
    let doc = await client.fetch(QUIZ_QUERY, {
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

        doc = await client.fetch(QUIZ_QUERY, {
          slugCandidates: nextSlugCandidates,
          lowerSlugCandidates: nextLowerCandidates
        });
      }
    }

    if (!doc) {
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
        console.error('[quiz slug] failed to build og:image URL', err);
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

    return { quiz: doc, breadcrumbs, seo, __dataSource: 'sanity' };
  } catch (err) {
    if (err?.status === 404) {
      throw err;
    }
    console.error(`[quiz/${slug}] Sanity fetch failed`, err);
    return buildFallback(primarySlug, url.pathname);
  }
};
