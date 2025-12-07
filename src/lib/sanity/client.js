// src/lib/sanity/client.js

// 【修正1】v7以降は createClient を使う必要があります
import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

// 【修正2】パスを './sanityDefaults.js' から '../sanityDefaults.js' に変更（適用済み）
import { SANITY_DEFAULTS, warnMissingSanityEnv } from '../sanityDefaults.js';

const projectId = import.meta.env?.VITE_SANITY_PROJECT_ID || SANITY_DEFAULTS.projectId;
const dataset = import.meta.env?.VITE_SANITY_DATASET || SANITY_DEFAULTS.dataset;
const apiVersion = import.meta.env?.VITE_SANITY_API_VERSION || SANITY_DEFAULTS.apiVersion;

warnMissingSanityEnv({
  source: 'client',
  projectId: import.meta.env?.VITE_SANITY_PROJECT_ID,
  dataset: import.meta.env?.VITE_SANITY_DATASET,
  apiVersion: import.meta.env?.VITE_SANITY_API_VERSION,
  logger: typeof console !== 'undefined' ? console : undefined
});

// 【修正3】sanityClient() ではなく createClient() を使用
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true, // `false` if you want to ensure fresh data
});

const builder = imageUrlBuilder(client);

export function urlFor(source) {
  return builder.image(source);
}
