// src/lib/sanityPublic.js
import imageUrlBuilder from '@sanity/image-url';

// ✅ ブラウザから読める “VITE_” 変数を使う
const projectId = import.meta.env.VITE_SANITY_PROJECT_ID;
const dataset   = import.meta.env.VITE_SANITY_DATASET || 'production';

if (!projectId) {
  console.error('VITE_SANITY_PROJECT_ID is missing');
}

const builder = imageUrlBuilder({ projectId, dataset });

// 画像URLを作るだけ（トークン不要）
export const urlFor = (source) => builder.image(source);
