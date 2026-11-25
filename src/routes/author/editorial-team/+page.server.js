import { createPageSeo } from '$lib/seo.js';

export const load = ({ url }) => ({
  seo: createPageSeo({
    title: '著者情報',
    description: '脳トレ日和編集部の運営者情報と、記事・クイズの制作方針をご紹介します。',
    path: url.pathname,
    breadcrumbs: [{ name: '著者情報', url: url.pathname }]
  })
});
