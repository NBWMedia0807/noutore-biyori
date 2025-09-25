import { createPageSeo } from '$lib/seo.js';

export const load = (event) => {
  const { url, setHeaders, isDataRequest } = event;

  if (!isDataRequest) {
    setHeaders({ 'cache-control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800' });
  }

  const seo = createPageSeo({
    title: 'お問い合わせ',
    description:
      '脳トレ日和へのご質問やご意見はこちらのフォームからお寄せください。サービス改善のためのフィードバックもお待ちしています。',
    path: url.pathname,
    breadcrumbs: [{ name: 'お問い合わせ', url: url.pathname }]
  });

  return { seo };
};
