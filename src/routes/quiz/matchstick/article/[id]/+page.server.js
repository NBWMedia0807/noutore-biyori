// src/routes/quiz/matchstick/article/[id]/+page.server.js

import { error } from '@sveltejs/kit';
import { client, urlFor, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { SITE } from '$lib/config/site.js';
import { createPageSeo, portableTextToPlain } from '$lib/seo.js';

export const prerender = false;

const QUIZ_IDS_QUERY = /* groq */ `
*[_type == "quiz" && defined(_id)]{ _id }
`;

const Q = /* groq */ `
*[_type == "quiz" && _id == $id][0]{
  _id,
  title,
  "slug": slug.current,
  category->{ _id, title, "slug": slug.current },
  problemDescription,
  "hints": select(
    defined(hints) => hints,
    defined(hint) => [hint],
    []
  ),
  adCode1,
  mainImage{ asset->{ url, metadata } },
  answerImage{ asset->{ url, metadata } },
  answerExplanation,
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
    const ids = await client.fetch(QUIZ_IDS_QUERY);
    return Array.isArray(ids) ? ids.filter((item) => item?._id).map((item) => ({ id: item._id })) : [];
  } catch (err) {
    console.error('[matchstick article] Failed to build prerender entries', err);
    return [];
  }
};

const buildFallback = (id, path) => {
  const fallbackTitle = 'クイズ記事';
  const breadcrumbs = [
    { name: 'クイズ一覧', url: '/quiz' },
    { name: fallbackTitle, url: path }
  ];

  const seo = {
    ...createPageSeo({
      title: fallbackTitle,
      description: 'クイズ記事の詳細ページです。',
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
      _id: id,
      title: fallbackTitle,
      slug: '',
      category: null,
      problemDescription: '',
      hints: [],
      mainImage: null,
      answerImage: null,
      answerExplanation: '',
      closingMessage: ''
    },
    breadcrumbs,
    seo,
    __dataSource: 'fallback'
  };
};

export const load = async (event) => {
  const { params, url, setHeaders, isDataRequest } = event;
  const id = params.id;

  if (!isDataRequest) {
    setHeaders({ 'cache-control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400' });
  }

  if (shouldSkipSanityFetch()) {
    return buildFallback(id, url.pathname);
  }

  try {
    const quiz = await client.fetch(Q, { id });
    if (!quiz) throw error(404, 'Not found');
    const descriptionSource = portableTextToPlain(quiz.problemDescription) || quiz.title;
    const description = descriptionSource.length > 120 ? `${descriptionSource.slice(0, 117)}…` : descriptionSource;

    const breadcrumbs = [{ name: 'クイズ一覧', url: '/quiz' }];
    if (quiz.category?.title && quiz.category?.slug) {
      breadcrumbs.push({ name: quiz.category.title, url: `/category/${quiz.category.slug}` });
    }
    breadcrumbs.push({ name: quiz.title, url: url.pathname });

    const OG_IMAGE_WIDTH = 1200;
    const OG_IMAGE_HEIGHT = 630;
    let resolvedImage = null;
    if (quiz.mainImage) {
      try {
        resolvedImage = urlFor(quiz.mainImage).width(OG_IMAGE_WIDTH).height(OG_IMAGE_HEIGHT).fit('crop').auto('format').url();
      } catch (err) {
        console.error('[matchstick article] failed to build og:image URL', err);
      }
    }

    const seo = {
      ...createPageSeo({
        title: quiz.title,
        description,
        path: url.pathname,
        type: 'article',
        image: resolvedImage ?? SITE.defaultOgImage,
        imageWidth: resolvedImage ? OG_IMAGE_WIDTH : undefined,
        imageHeight: resolvedImage ? OG_IMAGE_HEIGHT : undefined,
        breadcrumbs,
        article: {
          title: quiz.title,
          datePublished: quiz._createdAt,
          dateModified: quiz._updatedAt ?? quiz._createdAt,
          authorName: SITE.organization.name,
          category: quiz.category?.title ?? 'クイズ'
        }
      }),
      imageAlt: quiz.title
    };

    return { quiz, breadcrumbs, seo };
  } catch (err) {
    if (err?.status === 404) {
      throw err;
    }
    console.error(`[matchstick article:${id}] Sanity fetch failed`, err);
    return buildFallback(id, url.pathname);
  }
};
