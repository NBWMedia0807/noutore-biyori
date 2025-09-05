// src/lib/sanity.js  ← サーバ専用（client だけ）
import { createClient } from '@sanity/client';

export const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: process.env.SANITY_API_VERSION || '2023-05-03',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,   // サーバ側のみで使用
  perspective: 'published',
});

// ※ 画像URL生成(urlFor)はブラウザ専用の src/lib/sanityPublic.js を使う
