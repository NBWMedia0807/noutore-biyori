// src/lib/sanityPublic.js
import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

// ✅ ブラウザから読める “VITE_” 変数を使う
const projectId = import.meta.env?.VITE_SANITY_PROJECT_ID || 'quljge22';
const dataset = import.meta.env?.VITE_SANITY_DATASET || 'production';
const apiVersion = import.meta.env?.VITE_SANITY_API_VERSION || '2024-01-01';

if (!import.meta.env?.VITE_SANITY_PROJECT_ID) {
  console.warn('[sanityPublic] VITE_SANITY_PROJECT_ID is missing; using default projectId.');
}

let client;
try {
  client = createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: true // ブラウザ側は CDN でOK
  });
} catch (error) {
  console.error('[sanityPublic] Failed to create Sanity client:', error);
}

const builder = client ? imageUrlBuilder(client) : null;

// 画像URLを作るだけ
export const urlFor = (source) => {
  if (!builder || !source) return null;
  try {
    return builder.image(source);
  } catch (error) {
    console.error('Error generating image URL:', error);
    return null;
  }
};
