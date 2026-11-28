// src/lib/server/edge-cache.js
//
// Cloudflare Workers 実行時だけ使うエッジ処理（SvelteKit 非依存・テスト可能な純粋ロジック）。
//
// 前提: adapter-cloudflare の _worker.js は、SvelteKit を呼ぶ前に caches.default を
// リクエスト URL（クエリ込み）で引き、Cache-Control があり status < 400 のレスポンスを
// 自動で caches.default に保存する（s-maxage / no-store 等は Cloudflare の規則どおり）。
// そのため一覧ページやフィードの s-maxage は追加実装なしでキャッシュされる。
// ここでは保存処理を二重に持たず、レスポンスヘッダーで方針を指示するだけにする。
//
// - www → apex の 308 リダイレクト（Vercel では vercel.json が担当）
// - HSTS ヘッダー付与（Vercel では Vercel 自身が付与）
// - Vercel ISR の代わりに、記事ページへ長い s-maxage と Cache-Tag を付けてキャッシュさせる
//   UTM 付き URL は、まずクエリなしの URL のキャッシュを探して使う（ISR と同じく1記事1キャッシュに寄せる）
// - /api/revalidate から呼ぶパージ（ローカル cache.delete ＋ ゾーン purge API の URL 指定・タグ指定）
//
// Vercel 実行時は platform.caches が存在しないため、ここの処理は一切動かない。

import { applyWorkersDevRobots } from '../staging-host.js';

export const CANONICAL_HOST = 'noutorebiyori.com';
export const WWW_HOST = `www.${CANONICAL_HOST}`;

/** Vercel が付けていた値と同じ（2年） */
export const HSTS_VALUE = 'max-age=63072000';

/** 記事ページの既定キャッシュ秒数（CF_ARTICLE_CACHE_TTL で上書き可） */
export const DEFAULT_ARTICLE_TTL = 86400;

/** ブラウザ向けの max-age は従来（記事ページ max-age=60）と同じにする */
export const ARTICLE_BROWSER_MAX_AGE = 60;

export const EDGE_CACHE_STATUS_HEADER = 'x-edge-cache';

/** 全記事ページに付けるタグ（全記事を一括パージしたいとき用） */
export const ARTICLE_TAG = 'noutore-article';
/** 記事以外でキャッシュされるページ（一覧・フィード・sitemap 等）に付けるタグ */
export const PAGE_TAG = 'noutore-page';

/** Cloudflare の purge_cache は1回あたりの URL・タグ数に上限があるため分割する */
export const PURGE_BATCH_SIZE = 30;

// canonical 記事と、Sanity のフル slug を使うクイズの問題・解答ページ
const ARTICLE_PATH_PATTERNS = [
  /^\/category\/[^/]+\/([^/]+)$/, // /category/[categorySlug]/[quizSlug]（canonical）
  /^\/quiz\/([^/]+(?:\/[^/]+)*?)(?:\/answer)?$/ // /quiz/[...slug]（末尾の /answer は slug から除く）
];

/**
 * Cloudflare Workers（adapter-cloudflare）上で動いているか。
 * adapter-cloudflare は platform.caches を渡す。adapter-vercel は渡さない。
 */
export const getCloudflareCache = (platform) => {
  const cache = platform?.caches?.default;
  return cache && typeof cache.match === 'function' ? cache : null;
};

export const isCloudflarePlatform = (platform) => getCloudflareCache(platform) !== null;

/** www 付きで来たリクエストの apex への 308 リダイレクト先（不要なら null） */
export const resolveWwwRedirect = (url) => {
  if (!url || url.hostname !== WWW_HOST) return null;
  return `https://${CANONICAL_HOST}${url.pathname}${url.search}`;
};

/** 記事ページならクイズのスラッグ、そうでなければ null */
export const articleSlugFromPath = (pathname) => {
  if (typeof pathname !== 'string') return null;
  for (const re of ARTICLE_PATH_PATTERNS) {
    const m = pathname.match(re);
    if (m) return m[1];
  }
  return null;
};

export const isArticlePath = (pathname) => articleSlugFromPath(pathname) !== null;

/** スラッグごとの Cache-Tag（ASCII 以外はエンコード） */
export const quizCacheTag = (slug) => {
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    // そのまま使う
  }
  return `quiz-${encodeURIComponent(decoded)}`.slice(0, 1024);
};

export const parseTtl = (value, fallback = DEFAULT_ARTICLE_TTL) => {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const isUncacheable = (cacheControl) =>
  /(^|[\s,])(no-store|no-cache|private)([\s,=]|$)/i.test(cacheControl || '');

/** Cache-Control から s-maxage 秒数を取り出す（no-store / private は null） */
export const parseSharedMaxAge = (cacheControl) => {
  if (!cacheControl || isUncacheable(cacheControl)) return null;
  const m = cacheControl.toLowerCase().match(/(?:^|[\s,])s-maxage=(\d+)/);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  return n > 0 ? n : null;
};

/**
 * 記事ページの canonical キャッシュキー（クエリなし URL）。
 * GET の通常ページ表示で、記事パスかつクエリ付きのときだけ返す（クエリなしは adapter が既に引いている）。
 */
export const resolveCanonicalLookupKey = ({ method, url, isDataRequest }) => {
  if (method !== 'GET' || isDataRequest || !url || !url.search) return null;
  if (!isArticlePath(url.pathname)) return null;
  return `${url.origin}${url.pathname}`;
};

const appendCacheTags = (headers, tags) => {
  const existing = (headers.get('cache-tag') || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const merged = Array.from(new Set([...existing, ...tags]));
  headers.set('cache-tag', merged.join(','));
};

/**
 * レスポンスにキャッシュ方針ヘッダーを付ける（保存自体は adapter-cloudflare が行う）。
 * - 記事ページ（200）: Cache-Control を「ブラウザ 60 秒・エッジ articleTtl 秒」にし、記事タグを付与
 * - それ以外で s-maxage があるもの: PAGE_TAG を付与（一括パージ用）
 * @returns {Response} ヘッダーを書き換えたレスポンス（不要なら元のまま）
 */
export const applyEdgeCacheHeaders = (response, { method, url, isDataRequest, articleTtl }) => {
  if (!response || method !== 'GET' || isDataRequest || response.status !== 200) return response;
  if (response.headers.has('set-cookie')) return response;
  const cacheControl = response.headers.get('cache-control') || '';
  if (isUncacheable(cacheControl)) return response;

  const slug = url ? articleSlugFromPath(url.pathname) : null;
  if (slug) {
    const res = new Response(response.body, response);
    res.headers.set(
      'cache-control',
      `public, max-age=${ARTICLE_BROWSER_MAX_AGE}, s-maxage=${articleTtl}`
    );
    appendCacheTags(res.headers, [ARTICLE_TAG, quizCacheTag(slug)]);
    return res;
  }

  if (parseSharedMaxAge(cacheControl)) {
    const res = new Response(response.body, response);
    appendCacheTags(res.headers, [PAGE_TAG]);
    return res;
  }
  return response;
};

export const withHsts = (response, url) => {
  if (url?.protocol !== 'https:') return response;
  if (response.headers.has('strict-transport-security')) return response;
  try {
    response.headers.set('strict-transport-security', HSTS_VALUE);
    return response;
  } catch {
    // headers が immutable な場合はコピーして付与
    const copy = new Response(response.body, response);
    copy.headers.set('strict-transport-security', HSTS_VALUE);
    return copy;
  }
};

/**
 * hooks.server.js の handle から呼ぶ Cloudflare 用ラッパー。
 * @param {{ event: any, resolve: (event: any) => Promise<Response>, articleTtl?: number }} args
 */
export const handleCloudflareEdge = async ({ event, resolve, articleTtl = DEFAULT_ARTICLE_TTL }) => {
  const url = event.url;
  const finish = (response) => applyWorkersDevRobots(withHsts(response, url), url?.hostname);
  const redirectTo = resolveWwwRedirect(url);
  if (redirectTo) {
    return finish(new Response(null, { status: 308, headers: { location: redirectTo } }));
  }

  const method = event.request.method;
  const isDataRequest = Boolean(event.isDataRequest);
  const cache = getCloudflareCache(event.platform);

  // UTM 等のクエリ付き記事 URL: クエリなし URL のキャッシュがあればそれを返す
  const canonicalKey = cache ? resolveCanonicalLookupKey({ method, url, isDataRequest }) : null;
  if (canonicalKey) {
    try {
      const hit = await cache.match(new Request(canonicalKey, { method: 'GET' }));
      if (hit) {
        const res = new Response(hit.body, hit);
        res.headers.set(EDGE_CACHE_STATUS_HEADER, 'HIT-CANONICAL');
        return finish(res);
      }
    } catch (error) {
      console.error('[edge-cache] canonical match failed', error);
    }
  }

  const response = await resolve(event);
  return finish(applyEdgeCacheHeaders(response, { method, url, isDataRequest, articleTtl }));
};

/** パージ対象の絶対 URL 一覧（現在のオリジンと本番ドメインの両方） */
export const buildPurgeUrls = (paths, origins) => {
  const uniqueOrigins = Array.from(new Set((origins || []).filter(Boolean)));
  const urls = new Set();
  for (const path of paths || []) {
    if (typeof path !== 'string' || !path.startsWith('/')) continue;
    for (const origin of uniqueOrigins) urls.add(`${origin}${path}`);
  }
  return Array.from(urls);
};

const chunk = (list, size) => {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

/**
 * Cloudflare 上のキャッシュを URL 指定でパージする。
 * 1) このデータセンターの Cache API から cache.delete（常に実施）
 * 2) CF_ZONE_ID と CF_PURGE_API_TOKEN があればゾーンの purge_cache API で全データセンターから削除
 *    - files: URL 指定（クエリなしの URL）
 *    - tags: Cache-Tag 指定（UTM 付き URL で保存された記事キャッシュもまとめて消える）
 *
 * @returns {Promise<{ local: number, zone: 'ok' | 'skipped' | 'failed', errors: string[], urls: string[] }>}
 */
export const purgeCloudflareUrls = async ({
  platform,
  urls,
  tags = [],
  zoneId,
  apiToken,
  fetchImpl = fetch
}) => {
  const errors = [];
  let local = 0;
  const cache = getCloudflareCache(platform);
  if (cache) {
    for (const u of urls) {
      try {
        if (await cache.delete(new Request(u, { method: 'GET' }))) local++;
      } catch (error) {
        errors.push(`local delete failed: ${u}: ${error?.message || error}`);
      }
    }
  }

  let zone = 'skipped';
  const uniqueTags = Array.from(new Set((tags || []).filter(Boolean)));
  const bodies = [
    ...chunk(urls, PURGE_BATCH_SIZE).map((files) => ({ files })),
    ...chunk(uniqueTags, PURGE_BATCH_SIZE).map((t) => ({ tags: t }))
  ];
  if (zoneId && apiToken && bodies.length > 0) {
    zone = 'ok';
    for (const payload of bodies) {
      try {
        const res = await fetchImpl(
          `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(zoneId)}/purge_cache`,
          {
            method: 'POST',
            headers: {
              authorization: `Bearer ${apiToken}`,
              'content-type': 'application/json'
            },
            body: JSON.stringify(payload)
          }
        );
        const body = await res.json().catch(() => null);
        if (!res.ok || body?.success === false) {
          zone = 'failed';
          const detail = Array.isArray(body?.errors)
            ? body.errors.map((e) => e?.message).filter(Boolean).join('; ')
            : '';
          errors.push(`zone purge failed: HTTP ${res.status}${detail ? ` ${detail}` : ''}`);
        }
      } catch (error) {
        zone = 'failed';
        errors.push(`zone purge failed: ${error?.message || error}`);
      }
    }
  }

  return { local, zone, errors, urls, tags: uniqueTags };
};
