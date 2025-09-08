// src/lib/sanity.js
import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

// ── すべて環境変数から
const projectId  = process.env.SANITY_PROJECT_ID;
const dataset    = process.env.SANITY_DATASET ?? 'production';
const apiVersion = process.env.SANITY_API_VERSION ?? '2025-09-07';
// 読み取り用トークン（READ 権限） or 既存の API トークン
const token      = process.env.SANITY_READ_TOKEN ?? process.env.SANITY_API_TOKEN ?? undefined;

// Sanity クライアント（SSR で最新を取りたいので useCdn: false）
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token,
  perspective: 'published',
});

const builder = imageUrlBuilder(client);
export const urlFor = (source) => builder.image(source);

// ──────────────────────────────────────────────────────────────
// 一時デバッグログ（Vercel の Functions ログに出ます）
// 秘密は出さない（hasToken の真偽だけ）
// ──────────────────────────────────────────────────────────────
console.log('[sanity] cfg', {
  projectId,
  dataset,
  apiVersion,
  hasToken: Boolean(token),
});
