import { createPageSeo } from '$lib/seo.js';
import { vercelNodeConfig } from '$lib/server/runtime.js';

export const prerender = false;
export const config = vercelNodeConfig;

export const load = (event) => {
  const { url, setHeaders, isDataRequest } = event;

  if (!isDataRequest) {
    setHeaders({ 'cache-control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800' });
  }

  const seo = createPageSeo({
    title: 'プライバシーポリシー',
    description:
      '脳トレ日和における個人情報の取り扱い方針を掲載しています。データの利用目的や保護体制についてご確認いただけます。',
    path: url.pathname,
    breadcrumbs: [{ name: 'プライバシーポリシー', url: url.pathname }]
  });

  return { seo };
};
