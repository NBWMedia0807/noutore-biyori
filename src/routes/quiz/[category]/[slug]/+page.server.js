import { error } from '@sveltejs/kit';
import { client, urlFor } from '$lib/sanity.server.js';
import { SITE } from '$lib/config/site.js';
import { createPageSeo, portableTextToPlain } from '$lib/seo.js';

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

export const prerender = false;

export const load = async ({ params, setHeaders, url }) => {
  setHeaders({ 'cache-control': 'no-store' });
  const { category, slug } = params;
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
};
