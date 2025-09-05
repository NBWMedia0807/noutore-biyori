// src/lib/sanity.js ← サーバ専用 (client だけ)
import { createClient } from '@sanity/client';

export const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: process.env.SANITY_API_VERSION || '2023-05-03',
  useCdn: false, // 必ず fresh データを取りにいく
  token: process.env.SANITY_API_TOKEN, // サーバ側だけで利用
  perspective: 'published'
});

// ⚠️ 注意: 画像URL生成 (urlFor) はブラウザ専用の src/lib/sanityPublic.js を使うこと
