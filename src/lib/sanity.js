// src/lib/sanity.js（全置き換え）
import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

// 環境変数の取得とフォールバック処理
const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = import.meta.env.PUBLIC_SANITY_DATASET || 'production';

// projectIdが未定義の場合は警告
if (!projectId) {
  console.warn('PUBLIC_SANITY_PROJECT_ID is not defined. Using default: quljge22');
}

export const client = createClient({
  projectId: projectId || 'quljge22',
  dataset,
  apiVersion: '2025-08-26',  // 今日の日付（YYYY-MM-DD）
  useCdn: true,              // CDNを明示的に有効化
  perspective: 'published'
});

const builder = imageUrlBuilder(client);
export const urlFor = (src) => builder.image(src);
