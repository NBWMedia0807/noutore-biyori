// src/routes/quiz/matchstick/article/[id]/+page.server.js
export const prerender = false;

import { client, urlFor } from '$lib/sanity.server.js';
import { error } from '@sveltejs/kit';
import { SITE } from '$lib/config/site.js';
import { createPageSeo, portableTextToPlain } from '$lib/seo.js';

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

export const load = async ({ params, url }) => {
  const id = params.id;
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
};

