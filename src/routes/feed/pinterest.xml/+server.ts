// src/routes/feed/pinterest.xml/+server.ts
// Pinterest 用 RSS 2.0。マッチ棒クイズの縦長問題画像だけを流す。
import type { RequestHandler } from './$types';
import { createClient } from '@sanity/client';
import { SANITY_DEFAULTS } from '$lib/sanityDefaults.js';
import { RSS_PINTEREST_QUERY } from '$lib/queries/rssPinterest.groq.js';
import { buildPinterestFeed } from '$lib/rss/pinterestFeed.js';
import { withFeedUtm, FEED_UTM_SOURCE } from '$lib/utils/feedUtm.js';

export const prerender = false;
export const config = { runtime: 'nodejs22.x' };

// useCdn:false で api.sanity.io に直接接続（CDNのホスト許可リスト制限を回避）
const sanityClient = createClient({
  projectId: import.meta.env?.VITE_SANITY_PROJECT_ID || SANITY_DEFAULTS.projectId,
  dataset: import.meta.env?.VITE_SANITY_DATASET || SANITY_DEFAULTS.dataset,
  apiVersion: import.meta.env?.VITE_SANITY_API_VERSION || SANITY_DEFAULTS.apiVersion,
  useCdn: false,
});

const decorateLink = (url: string) => withFeedUtm(url, { source: FEED_UTM_SOURCE.pinterest });

export const GET: RequestHandler = async () => {
  const headers = {
    'Content-Type': 'application/rss+xml; charset=utf-8',
    'Cache-Control': 'public, max-age=300, s-maxage=3600',
  };

  try {
    const docs: any[] = await sanityClient.fetch(RSS_PINTEREST_QUERY);
    return new Response(buildPinterestFeed(docs, { decorateLink }), { status: 200, headers });
  } catch (err: any) {
    console.error('[feed/pinterest] fetch error:', err?.message ?? String(err));
    return new Response(buildPinterestFeed([]), {
      status: 503,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }
};
