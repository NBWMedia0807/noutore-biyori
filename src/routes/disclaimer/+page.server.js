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
    title: '免責事項',
    description:
      '脳トレ日和の免責事項ページです。広告や外部リンク、掲載情報の正確性に関する責任範囲をご確認いただけます。',
    path: url.pathname,
    breadcrumbs: [{ name: '免責事項', url: url.pathname }]
  });

  return { seo };
};
