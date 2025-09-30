// src/lib/sanityPublic.js
import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import { SANITY_DEFAULTS, warnMissingSanityEnv } from './sanityDefaults.js';

// ✅ ブラウザから読める “VITE_” 変数を使う
const projectId = import.meta.env?.VITE_SANITY_PROJECT_ID || SANITY_DEFAULTS.projectId;
const dataset = import.meta.env?.VITE_SANITY_DATASET || SANITY_DEFAULTS.dataset;
const apiVersion = import.meta.env?.VITE_SANITY_API_VERSION || SANITY_DEFAULTS.apiVersion;

warnMissingSanityEnv({
  source: 'public',
  projectId: import.meta.env?.VITE_SANITY_PROJECT_ID,
  dataset: import.meta.env?.VITE_SANITY_DATASET,
  apiVersion: import.meta.env?.VITE_SANITY_API_VERSION,
  logger: typeof console !== 'undefined' ? console : undefined
});

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
