// src/routes/feed/pinterest.xml/+server.js
//
// Pinterest 用 RSS 2.0。マッチ棒クイズのうち縦長画像（pinterestImage）がある問題だけを流す。
// XML の組み立ては $lib/rss/pinterestFeed.js（テストから同じコードを実行するため分離）。
// ここは Sanity 取得と HTTP 応答のみ。

import { createClient } from '@sanity/client';
import { SANITY_DEFAULTS } from '$lib/sanityDefaults.js';
import { buildPinterestFeed } from '$lib/rss/pinterestFeed.js';
import { RSS_PINTEREST_QUERY } from '$lib/queries/rssPinterest.groq.js';

export const prerender = false;
export const config = { runtime: 'nodejs22.x' };

// useCdn:false で api.sanity.io に直接接続（他フィードと同じ）
const sanityClient = createClient({
  projectId: import.meta.env?.VITE_SANITY_PROJECT_ID || SANITY_DEFAULTS.projectId,
  dataset: import.meta.env?.VITE_SANITY_DATASET || SANITY_DEFAULTS.dataset,
  apiVersion: import.meta.env?.VITE_SANITY_API_VERSION || SANITY_DEFAULTS.apiVersion,
  useCdn: false,
});

export const GET = async ({ setHeaders }) => {
  const headers = {
    'Content-Type': 'application/rss+xml; charset=utf-8',
    'Cache-Control': 'public, max-age=300, s-maxage=3600',
  };
  setHeaders(headers);

  try {
    const docs = await sanityClient.fetch(RSS_PINTEREST_QUERY);
    return new Response(buildPinterestFeed(docs), { status: 200, headers });
  } catch (err) {
    console.error('[feed/pinterest] fetch error:', err?.message ?? String(err));
    return new Response(buildPinterestFeed([]), {
      status: 503,
      headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
};
