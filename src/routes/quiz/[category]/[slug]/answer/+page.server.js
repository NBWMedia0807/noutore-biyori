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
*[_type=='quiz' && slug.current==$slug && (
  (defined(category._ref) && category->slug.current==$category) ||
  (!defined(category._ref) && category==$category)
)][0]{
  title,
  "slug": slug.current,
  category->{ title, "slug": slug.current },
  answerImage{ asset->{ url, metadata } },
  answerExplanation,
  adCode1,
  adCode2,
  closingMessage,
  _createdAt,
  _updatedAt
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
    console.error('[quiz answer] Failed to build prerender entries', err);
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
    breadcrumbs.push({ name: fallbackTitle, url: `/quiz/${fallbackCategorySlug}/${slug}` });
  }
  breadcrumbs.push({ name: `${fallbackTitle} 正解`, url: path });

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
        category: fallbackCategoryTitle
      }
    }),
    imageAlt: `${fallbackTitle}の正解`
  };

  return {
    quiz: {
      title: fallbackTitle,
      slug,
      category: {
        title: fallbackCategoryTitle,
        slug: fallbackCategorySlug
      },
      answerImage: null,
      answerExplanation: '',
      closingMessage: ''
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

    const explanation = portableTextToPlain(doc.answerExplanation);
    const descriptionBase = explanation || `${doc.title}の正解と解説をご紹介します。`;
    const description = descriptionBase.length > 120 ? `${descriptionBase.slice(0, 117)}…` : descriptionBase;

    const breadcrumbs = [{ name: 'クイズ一覧', url: '/quiz' }];
    if (doc.category?.title && doc.category?.slug) {
      breadcrumbs.push({ name: doc.category.title, url: `/category/${doc.category.slug}` });
      breadcrumbs.push({ name: doc.title, url: `/quiz/${doc.category.slug}/${doc.slug}` });
    } else {
      breadcrumbs.push({ name: doc.title, url: `/quiz/${category}/${slug}` });
    }
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

    return { quiz: doc, __dataSource: 'sanity', breadcrumbs, seo };
  } catch (err) {
    if (err?.status === 404) {
      throw err;
    }
    console.error(`[quiz answer:${category}/${slug}] Sanity fetch failed`, err);
    return buildFallback(category, slug, url.pathname);
  }
};

