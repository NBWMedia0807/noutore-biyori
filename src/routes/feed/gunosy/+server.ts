// src/routes/feed/gunosy/+server.ts
//
// GunosyFeed（仕様書 ver 3.2.4 準拠）の配信エンドポイント。
// このフィード1本で「グノシー」「ニュースライト」「auサービスToday」へ連携される。
//
// XML の組み立てロジックは $lib/rss/gunosyFeed.js に切り出してある
// （SvelteKit に依存しない純粋なモジュールにして、検証スクリプトとテストから
//  同じコードを実行できるようにするため）。ここは Sanity 取得と HTTP 応答のみ。
//
// 検証: pnpm run validate:gunosy [フィードURL]

import type { RequestHandler } from './$types';
import { createClient } from '@sanity/client';
import { SANITY_DEFAULTS } from '$lib/sanityDefaults.js';
import { buildImageUrl } from '$lib/rss/images';
import { buildGunosyFeed } from '$lib/rss/gunosyFeed.js';
import { resolvePublishedDate } from '$lib/queries/quizVisibility.js';
import { RSS_GUNOSY_QUERY } from '$lib/queries/rssGunosy.groq.js';

export const prerender = false;
export const config = { runtime: 'nodejs22.x' };

// useCdn:false で api.sanity.io に直接接続（CDNのホスト許可リスト制限を回避）
const sanityClient = createClient({
  projectId: import.meta.env?.VITE_SANITY_PROJECT_ID || SANITY_DEFAULTS.projectId,
  dataset: import.meta.env?.VITE_SANITY_DATASET || SANITY_DEFAULTS.dataset,
  apiVersion: import.meta.env?.VITE_SANITY_API_VERSION || SANITY_DEFAULTS.apiVersion,
  useCdn: false,
});

const GA_MEASUREMENT_ID = import.meta.env?.VITE_GA_ID || 'G-855Y7S6M95';

const feedDeps = {
  buildImageUrl,
  resolvePublishedDate,
  gaMeasurementId: GA_MEASUREMENT_ID,
};

export const GET: RequestHandler = async ({ request, setHeaders }) => {
  // 接続元の確認用（'Gunosy/1.0' / 'Gunosy-Newspass/1.0' / 'Gunosy-Servicetoday/1.0'）
  console.log(`[feed/gunosy] User-Agent: ${request.headers.get('user-agent') ?? 'unknown'}`);

  const headers = {
    'Content-Type': 'application/xml; charset=utf-8',
    // 取得間隔は最短1分。channel/ttl（15分）と揃える。
    'Cache-Control': 'public, max-age=300, s-maxage=900',
  };
  setHeaders(headers);

  try {
    const docs: unknown = await sanityClient.fetch(RSS_GUNOSY_QUERY);
    const feed = buildGunosyFeed(Array.isArray(docs) ? docs : [], feedDeps);
    return new Response(feed, { status: 200, headers });
  } catch (err) {
    console.error('[feed/gunosy] fetch error:', (err as Error)?.message ?? String(err));
    return new Response(buildGunosyFeed([], feedDeps), {
      status: 503,
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
};
