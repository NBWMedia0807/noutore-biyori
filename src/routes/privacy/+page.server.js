import { createPageSeo } from '$lib/seo.js';

export const load = ({ url }) => {
  const seo = createPageSeo({
    title: 'プライバシーポリシー',
    description:
      '脳トレ日和における個人情報の取り扱い方針を掲載しています。データの利用目的や保護体制についてご確認いただけます。',
    path: url.pathname,
    breadcrumbs: [{ name: 'プライバシーポリシー', url: url.pathname }]
  });

  return { seo };
};
