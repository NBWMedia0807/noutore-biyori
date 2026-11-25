// src/hooks.server.js
//
// 着地リクエストの User-Agent / Referer をログに出力する。
// 判定とログ整形は $lib/server/landing-log.js（SvelteKit 非依存）に切り出してある。
//
// ── ログの読み方 ────────────────────────────────────────
// Vercel の Functions ログを `[landing]` で絞り込むと1着地1行で出る。
//   [landing] {"path":"/category/kanji-quiz/xxx","guess":"gunosy","ua":"...","ref":"","sfs":"none",...}
// Referer が空 かつ sfs（Sec-Fetch-Site）が `none` のものが、
// GA4 で (direct)/(none) に落ちている流入。ここの User-Agent に何が入るかを見る。
//
// ── 計測が終わったら ────────────────────────────────────
// 恒久的に必要なログではない。Vercel の環境変数に `LANDING_LOG=off` を設定すれば
// 再デプロイなしで止められる。切り分けが済んだらこのファイルごと削除してよい。

import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import { buildLandingLogLine, isLandingRequest } from '$lib/server/landing-log.js';
import { handleCloudflareEdge, isCloudflarePlatform, parseTtl } from '$lib/server/edge-cache.js';
import {
  applyWorkersDevRobots,
  isWorkersDevHost,
  stripStagingAdNetworkHints
} from '$lib/staging-host.js';

const isEnabled = () => (env.LANDING_LOG ?? 'on').toLowerCase() !== 'off';

/** @type {import('@sveltejs/kit').Handle} */
export const handle = async ({ event, resolve }) => {
  // プリレンダリング時（ビルド中）はアクセスではないのでログを出さない
  const shouldLog =
    !building &&
    isEnabled() &&
    isLandingRequest({
      method: event.request.method,
      pathname: event.url.pathname,
      secFetchDest: event.request.headers.get('sec-fetch-dest'),
      isDataRequest: event.isDataRequest,
      isSubRequest: event.isSubRequest,
    });

  if (shouldLog) {
    const headers = event.request.headers;
    console.log(
      buildLandingLogLine({
        pathname: event.url.pathname,
        search: event.url.search,
        userAgent: headers.get('user-agent'),
        referer: headers.get('referer'),
        secFetchSite: headers.get('sec-fetch-site'),
        secFetchMode: headers.get('sec-fetch-mode'),
        acceptLanguage: headers.get('accept-language'),
      })
    );
  }

  // *.workers.dev では app.html の広告ドメイン向け preconnect / preload を外す。
  // 本番ホストでは変換しない（Vercel の HTML はそのまま）。
  const resolveEvent = (incoming) => {
    if (building || !isWorkersDevHost(incoming.url.hostname)) return resolve(incoming);
    return resolve(incoming, {
      transformPageChunk: ({ html }) => stripStagingAdNetworkHints(html)
    });
  };

  // Cloudflare Workers 実行時だけ: www→apex 308・HSTS・Cache API による記事キャッシュ。
  // Vercel 実行時は platform.caches が無いので従来どおり（vercel.json と ISR が担当）。
  if (!building && isCloudflarePlatform(event.platform)) {
    return handleCloudflareEdge({
      event,
      resolve: resolveEvent,
      articleTtl: parseTtl(env.CF_ARTICLE_CACHE_TTL)
    });
  }

  const response = await resolveEvent(event);
  return applyWorkersDevRobots(response, event.url.hostname);
};
