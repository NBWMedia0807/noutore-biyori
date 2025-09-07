// src/lib/sanity.js
import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

const projectId  = process.env.SANITY_PROJECT_ID;
const dataset    = process.env.SANITY_DATASET ?? 'production';
const apiVersion = process.env.SANITY_API_VERSION ?? '2025-09-07';
// どちらの名前でも拾えるようにしておく
const token      = process.env.SANITY_READ_TOKEN ?? process.env.SANITY_API_TOKEN ?? undefined;

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,            // SSRで確実に最新を取得
  token,                    // private dataset でも動く
  perspective: 'published', // 公開版のみ
});

const builder = imageUrlBuilder(client);
export const urlFor = (source) => builder.image(source);
