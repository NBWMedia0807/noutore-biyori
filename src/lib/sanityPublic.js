// src/lib/sanityPublic.js
import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

// ✅ ブラウザから読める “VITE_” 変数を使う
const projectId = import.meta.env.VITE_SANITY_PROJECT_ID;
const dataset   = import.meta.env.VITE_SANITY_DATASET || 'production';

if (!projectId) {
  console.error('VITE_SANITY_PROJECT_ID is missing');
}

// 読み取り専用クライアント（トークン不要）
const client = createClient({
  projectId,
  dataset,
  apiVersion: '2023-05-03',
  useCdn: true, // ブラウザ側は CDN でOK
});

const builder = imageUrlBuilder(client);

// 画像URLを作るだけ
export const urlFor = (source) => builder.image(source);
