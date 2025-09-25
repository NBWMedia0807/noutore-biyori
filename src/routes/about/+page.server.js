import { createPageSeo } from '$lib/seo.js';

export const load = (event) => {
  const { url, setHeaders, isDataRequest } = event;

  if (!isDataRequest) {
    setHeaders({ 'cache-control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800' });
  }

  const seo = createPageSeo({
    title: 'サイトについて',
    description:
      '脳トレ日和の目的や提供コンテンツ、運営体制についてご紹介します。高齢者の方も安心して楽しめる脳トレサイトのこだわりをご確認ください。',
    path: url.pathname,
    breadcrumbs: [{ name: 'サイトについて', url: url.pathname }]
  });

  return { seo };
};
