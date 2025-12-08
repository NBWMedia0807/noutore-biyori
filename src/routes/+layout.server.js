// src/routes/+layout.server.js
import { client } from '$lib/sanity/client';

// グロナビに表示したい項目の定義
const MENU_ITEMS = [
  { title: 'マッチ棒クイズ', slug: 'matchstick-quiz' },
  { title: '漢字間違い探し', slug: 'kanji-mistake' },
  { title: '読解クイズ', slug: 'reading-quiz' }
];

export const load = async ({ url }) => {
  // 1. 現在のURL情報を取得
  const pathname = url.pathname;

  // 2. Sanityからカテゴリーデータを取得（存在確認用）
  const query = `*[_type == "category"]{title, "slug": slug.current}`;
  const sanityCategories = await client.fetch(query).catch(() => []);

  // 3. メニューを構築（Sanityにデータがなくても強制的に表示）
  const categories = MENU_ITEMS.map(item => {
    // Sanityにデータがあればそれを使う、なければ固定定義を使う
    const found = sanityCategories.find(c => c.slug === item.slug);
    return found || item;
  });

  return {
    url: pathname,
    categories: categories, // これがグロナビに渡されます
    // その他必要なデータがあればここに追加
  };
};