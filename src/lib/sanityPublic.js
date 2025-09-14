// src/lib/sanityPublic.js
import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

// ✅ ブラウザから読める “VITE_” 変数を使う
const projectId = import.meta.env.VITE_SANITY_PROJECT_ID;
const dataset   = import.meta.env.VITE_SANITY_DATASET || 'production';

if (!projectId) {
  console.error('VITE_SANITY_PROJECT_ID is missing');
}

// APIバージョンは環境変数を参照（デフォルト: 2024-01-01）
const apiVersion =
  (import.meta.env (typeof process !== 'undefined' && process.env && process.env.SANITY_API_VERSION)(typeof process !== 'undefined' && process.env && process.env.SANITY_API_VERSION) import.meta.env.VITE_SANITY_API_VERSION) ||
  '2024-01-01';

// 読み取り専用クライアント（トークン不要）
const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true, // ブラウザ側は CDN でOK
});

const builder = imageUrlBuilder(client);

// 画像URLを作るだけ
export const urlFor = (source) => {
  if (!source) return null;
  try {
    return builder.image(source);
  } catch (error) {
    console.error('Error generating image URL:', error);
    return null;
  }
};
