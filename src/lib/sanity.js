// src/lib/sanity.js
import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

const projectId  = process.env.SANITY_PROJECT_ID;
const dataset    = process.env.SANITY_DATASET || 'production';
const apiVersion = process.env.SANITY_API_VERSION || '2023-05-03';
const token      = process.env.SANITY_API_TOKEN; // 読み取り用（サーバのみで使用）

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token,           // サーバ側の +page.server.js からのみ使う
  perspective: 'published'
});

const builder = imageUrlBuilder(client);
export const urlFor = (source) => builder.image(source);
