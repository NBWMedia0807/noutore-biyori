// src/routes/+layout.server.js
import { client } from '$lib/sanity/client';

const MENU_ITEMS = [
  { title: 'マッチ棒クイズ', slug: 'matchstick-quiz' },
  { title: '読解クイズ', slug: 'reading-quiz' }
];

const CATEGORY_QUERY = `*[_type == "category"]{title, "slug": slug.current}`;
const CACHE_TTL = 10 * 60 * 1000; // 10分

// サーバーインスタンス内で Sanity へのリクエストを10分に1回に抑えるキャッシュ
let _cache = null;

export const load = async ({ url }) => {
  const pathname = url.pathname;

  const now = Date.now();
  if (!_cache || now - _cache.ts > CACHE_TTL) {
    const sanityCategories = await client.fetch(CATEGORY_QUERY).catch(() => []);
    _cache = { data: sanityCategories, ts: now };
  }

  const categories = MENU_ITEMS.map(item => {
    const found = _cache.data.find(c => c.slug === item.slug);
    return found || item;
  });

  return {
    url: pathname,
    categories,
  };
};