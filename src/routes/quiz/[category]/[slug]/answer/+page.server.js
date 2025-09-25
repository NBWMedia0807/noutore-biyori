import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity.server.js';
import { SITE } from '$lib/config/site.js';
import { createPageSeo, portableTextToPlain } from '$lib/seo.js';

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

export const prerender = false;

export const load = async ({ params, setHeaders, url }) => {
  setHeaders({ 'cache-control': 'no-store' });
  const { category, slug } = params;
  const doc = await client.fetch(QUERY, { category, slug });
  if (!doc) throw error(404, 'Not found');
  const explanation = portableTextToPlain(doc.answerExplanation);
  const descriptionBase = explanation || `${doc.title}の正解と解説をご紹介します。`;
  const description = descriptionBase.length > 120 ? `${descriptionBase.slice(0, 117)}…` : descriptionBase;

  const breadcrumbs = [
    { name: 'クイズ一覧', url: '/quiz' }
  ];
  if (doc.category?.title && doc.category?.slug) {
    breadcrumbs.push({ name: doc.category.title, url: `/category/${doc.category.slug}` });
    breadcrumbs.push({ name: doc.title, url: `/quiz/${doc.category.slug}/${doc.slug}` });
  } else {
    breadcrumbs.push({ name: doc.title, url: `/quiz/${category}/${slug}` });
  }
  breadcrumbs.push({ name: `${doc.title} 正解`, url: url.pathname });

  const seo = {
    ...createPageSeo({
      title: `${doc.title} 正解`,
      description,
      path: url.pathname,
      type: 'article',
      image: doc.answerImage?.asset?.url ?? SITE.defaultOgImage,
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

  return { quiz: doc, __dataSource: 'sanity', seo };
};

