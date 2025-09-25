import { error } from '@sveltejs/kit';
import { client, urlFor, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { SITE } from '$lib/config/site.js';
import { createPageSeo, portableTextToPlain } from '$lib/seo.js';

const QUIZ_SLUGS_QUERY = /* groq */ `
*[_type == "quiz" && defined(slug.current)]{
  "slug": slug.current,
  "category": select(
    defined(category._ref) => category->slug.current,
    defined(category.slug.current) => category.slug.current,
    defined(category) => category,
    null
  )
}`;

const QUERY = /* groq */ `
*[_type == "quiz" && slug.current == $slug && (
  (defined(category._ref) && category->slug.current == $category) ||
  (!defined(category._ref) && category == $category)
)][0]{
  _id,
  _createdAt,
  _updatedAt,
  title,
  "slug": slug.current,
  category->{ title, "slug": slug.current },
  mainImage{ asset->{ url, metadata } },
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
      .filter((item) => item?.slug && item?.category)
      .map((item) => {
        const key = `${item.category}__${item.slug}`;
        if (seen.has(key)) return null;
        seen.add(key);
        return { category: item.category, slug: item.slug };
      })
      .filter(Boolean);
  } catch (err) {
    console.error('[quiz detail] Failed to build prerender entries', err);
    return [];
  }
};

const buildFallback = (category, slug, path) => {
  const fallbackCategorySlug = category ?? '';
  const fallbackCategoryTitle = fallbackCategorySlug ? fallbackCategorySlug.replace(/-/g, ' ') : 'クイズ';
  const fallbackTitle = slug ? slug.replace(/-/g, ' ') : 'クイズ詳細';
  const breadcrumbs = [{ name: 'クイズ一覧', url: '/quiz' }];
  if (fallbackCategorySlug) {
    breadcrumbs.push({ name: fallbackCategoryTitle, url: `/quiz/${fallbackCategorySlug}` });
  }
  breadcrumbs.push({ name: fallbackTitle, url: path });

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
        category: fallbackCategoryTitle
      }
    }),
    imageAlt: fallbackTitle
  };

  return {
    quiz: {
      _id: `${fallbackCategorySlug || 'category'}-${slug || 'quiz'}`,
      title: fallbackTitle,
      slug,
      category: {
        title: fallbackCategoryTitle,
        slug: fallbackCategorySlug
      },
      mainImage: null,
      problemDescription: '',
      hints: []
    },
    __dataSource: 'fallback',
    breadcrumbs,
    seo
  };
};

export const load = async (event) => {
  const { params, setHeaders, url, isDataRequest } = event;
  const { category, slug } = params;

  if (!isDataRequest) {
    setHeaders({ 'cache-control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400' });
  }

  if (shouldSkipSanityFetch()) {
    return buildFallback(category, slug, url.pathname);
  }

  try {
    const doc = await client.fetch(QUERY, { category, slug });
    if (!doc) throw error(404, 'Not found');

    const descriptionSource = portableTextToPlain(doc.problemDescription) || doc.title;
    const description = descriptionSource.length > 120 ? `${descriptionSource.slice(0, 117)}…` : descriptionSource;
    const OG_IMAGE_WIDTH = 1200;
    const OG_IMAGE_HEIGHT = 630;
    let resolvedImage = null;

    if (doc.mainImage) {
      try {
        resolvedImage = urlFor(doc.mainImage).width(OG_IMAGE_WIDTH).height(OG_IMAGE_HEIGHT).fit('crop').auto('format').url();
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
          category: doc.category?.title
        }
      }),
      imageAlt: doc.title
    };

    return { quiz: doc, __dataSource: 'sanity', breadcrumbs, seo };
  } catch (err) {
    if (err?.status === 404) {
      throw err;
    }
    console.error(`[quiz detail:${category}/${slug}] Sanity fetch failed`, err);
    return buildFallback(category, slug, url.pathname);
  }
};
