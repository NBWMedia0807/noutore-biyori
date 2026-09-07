// src/hooks.server.js
//
// このフックの役割は2つ。
//   1. app.html の `%ga.measurementId%` を GA4 の測定IDへ置換する（恒久的に必要）
//   2. 着地リクエストの User-Agent / Referer をログに出力する（一時的な調査用）
//
// 2 の判定とログ整形は $lib/server/landing-log.js（SvelteKit 非依存）に切り出してある。
//
// ── ログの読み方 ────────────────────────────────────────
// Vercel の Functions ログを `[landing]` で絞り込むと1着地1行で出る。
//   [landing] {"path":"/category/kanji-quiz/xxx","guess":"gunosy","ua":"...","ref":"","sfs":"none",...}
// Referer が空 かつ sfs（Sec-Fetch-Site）が `none` のものが、
// GA4 で (direct)/(none) に落ちている流入。ここの User-Agent に何が入るかを見る。
//
// ── 計測が終わったら ────────────────────────────────────
// 恒久的に必要なログではない。Vercel の環境変数に `LANDING_LOG=off` を設定すれば
// 再デプロイなしで止められる。切り分けが済んだらログ関連の記述だけを削除すること。
// **このファイル自体は GA4 の測定ID埋め込みに必要なので削除しないこと。**

import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import { buildLandingLogLine, isLandingRequest } from '$lib/server/landing-log.js';
import { GA_MEASUREMENT_ID, GA_MEASUREMENT_ID_PLACEHOLDER } from '$lib/config/analytics.js';

const isEnabled = () => (env.LANDING_LOG ?? 'on').toLowerCase() !== 'off';

// app.html に置いた `%ga.measurementId%` を実際の測定IDへ差し替える。
// app.html は Vite の処理対象外で import.meta.env を参照できないため、
// 測定IDの出所を $lib/config/analytics.js 1箇所に保ったまま初期HTMLへ埋め込む方法として
// SvelteKit 標準の transformPageChunk を使う。
// 置換対象は <head> 内の2箇所（gtag.js の src と config）で、いずれも最初のチャンクに入る。
const injectGaMeasurementId = ({ html }) =>
  html.includes(GA_MEASUREMENT_ID_PLACEHOLDER)
    ? html.replaceAll(GA_MEASUREMENT_ID_PLACEHOLDER, GA_MEASUREMENT_ID)
    : html;

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

  return resolve(event, { transformPageChunk: injectGaMeasurementId });
};
