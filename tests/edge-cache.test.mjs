// tests/edge-cache.test.mjs
//
// Cloudflare Workers 用のエッジ処理（$lib/server/edge-cache.js）と
// 本番ドメイン基点（$lib/server/site-origin.js）のテスト。サーバーは立てない。
//
//   pnpm run test:edge-cache

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ARTICLE_TAG,
  DEFAULT_ARTICLE_TTL,
  EDGE_CACHE_STATUS_HEADER,
  HSTS_VALUE,
  PAGE_TAG,
  PURGE_BATCH_SIZE,
  applyEdgeCacheHeaders,
  articleSlugFromPath,
  buildPurgeUrls,
  handleCloudflareEdge,
  isArticlePath,
  isCloudflarePlatform,
  parseSharedMaxAge,
  parseTtl,
  purgeCloudflareUrls,
  quizCacheTag,
  resolveCanonicalLookupKey,
  resolveWwwRedirect
} from '../src/lib/server/edge-cache.js';
import { resolveIndexNowBase, resolveSiteOrigin } from '../src/lib/server/site-origin.js';

// Workers の caches.default を模したメモリキャッシュ
const createMemoryCache = () => {
  const store = new Map();
  return {
    store,
    async match(req) {
      const hit = store.get(req.url);
      return hit ? hit.clone() : undefined;
    },
    async put(req, res) {
      store.set(req.url, res.clone());
    },
    async delete(req) {
      return store.delete(req.url);
    }
  };
};

const cfPlatform = (cache = createMemoryCache()) => {
  const pending = [];
  return {
    caches: { default: cache },
    ctx: { waitUntil: (p) => pending.push(p) },
    cache,
    flush: () => Promise.all(pending)
  };
};

const makeEvent = (href, { platform, method = 'GET', isDataRequest = false } = {}) => ({
  url: new URL(href),
  request: new Request(href, { method }),
  platform,
  isDataRequest
});

test('isCloudflarePlatform: Vercel（caches なし）では false', () => {
  assert.equal(isCloudflarePlatform(undefined), false);
  assert.equal(isCloudflarePlatform({ context: {} }), false);
  assert.equal(isCloudflarePlatform(cfPlatform()), true);
});

test('resolveWwwRedirect: www だけ apex へ（パスとクエリを保持）', () => {
  assert.equal(
    resolveWwwRedirect(new URL('https://www.noutorebiyori.com/quiz?utm_source=x')),
    'https://noutorebiyori.com/quiz?utm_source=x'
  );
  assert.equal(resolveWwwRedirect(new URL('https://noutorebiyori.com/quiz')), null);
  assert.equal(resolveWwwRedirect(new URL('https://noutore-biyori.example.workers.dev/')), null);
});

test('isArticlePath: canonical 記事と解答ページだけ', () => {
  assert.equal(isArticlePath('/category/matchstick/abc-123'), true);
  assert.equal(isArticlePath('/quiz/abc-123/answer'), true);
  assert.equal(isArticlePath('/category/matchstick'), false);
  assert.equal(isArticlePath('/quiz/abc-123'), false);
  assert.equal(isArticlePath('/category/a/b/c'), false);
  assert.equal(isArticlePath('/'), false);
});

test('parseSharedMaxAge / parseTtl', () => {
  assert.equal(parseSharedMaxAge('public, max-age=300, s-maxage=1800, stale-while-revalidate=86400'), 1800);
  assert.equal(parseSharedMaxAge('public, max-age=60'), null);
  assert.equal(parseSharedMaxAge('no-store'), null);
  assert.equal(parseSharedMaxAge('private, s-maxage=100'), null);
  assert.equal(parseSharedMaxAge(null), null);
  assert.equal(parseTtl('604800'), 604800);
  assert.equal(parseTtl(undefined), DEFAULT_ARTICLE_TTL);
  assert.equal(parseTtl('abc'), DEFAULT_ARTICLE_TTL);
  assert.equal(parseTtl('-1'), DEFAULT_ARTICLE_TTL);
});

test('articleSlugFromPath / quizCacheTag', () => {
  assert.equal(articleSlugFromPath('/category/matchstick/abc-123'), 'abc-123');
  assert.equal(articleSlugFromPath('/quiz/abc-123/answer'), 'abc-123');
  assert.equal(articleSlugFromPath('/quiz/abc-123'), null);
  assert.equal(quizCacheTag('abc-123'), 'quiz-abc-123');
  assert.equal(quizCacheTag('漢字'), `quiz-${encodeURIComponent('漢字')}`);
  assert.equal(quizCacheTag(encodeURIComponent('漢字')), `quiz-${encodeURIComponent('漢字')}`);
});

test('resolveCanonicalLookupKey: クエリ付きの記事 GET だけ、クエリなし URL を返す', () => {
  const base = { method: 'GET', isDataRequest: false };
  assert.equal(
    resolveCanonicalLookupKey({ ...base, url: new URL('https://noutorebiyori.com/category/m/abc?utm_source=gunosy') }),
    'https://noutorebiyori.com/category/m/abc'
  );
  assert.equal(resolveCanonicalLookupKey({ ...base, url: new URL('https://noutorebiyori.com/category/m/abc') }), null);
  assert.equal(resolveCanonicalLookupKey({ ...base, url: new URL('https://noutorebiyori.com/quiz?page=2') }), null);
  assert.equal(
    resolveCanonicalLookupKey({ ...base, method: 'POST', url: new URL('https://noutorebiyori.com/category/m/abc?a=1') }),
    null
  );
  assert.equal(
    resolveCanonicalLookupKey({ ...base, isDataRequest: true, url: new URL('https://noutorebiyori.com/category/m/abc?a=1') }),
    null
  );
});

test('applyEdgeCacheHeaders: 記事は長い s-maxage とタグ、一覧は PAGE_TAG、対象外はそのまま', () => {
  const opts = (href, extra = {}) => ({
    method: 'GET',
    isDataRequest: false,
    articleTtl: 604800,
    url: new URL(href),
    ...extra
  });
  const page = () =>
    new Response('x', { status: 200, headers: { 'cache-control': 'public, max-age=60, s-maxage=300' } });

  const article = applyEdgeCacheHeaders(page(), opts('https://noutorebiyori.com/category/m/abc'));
  assert.equal(article.headers.get('cache-control'), 'public, max-age=60, s-maxage=604800');
  assert.equal(article.headers.get('cache-tag'), `${ARTICLE_TAG},quiz-abc`);

  const list = applyEdgeCacheHeaders(
    new Response('x', { status: 200, headers: { 'cache-control': 'public, max-age=300, s-maxage=1800' } }),
    opts('https://noutorebiyori.com/quiz')
  );
  assert.equal(list.headers.get('cache-control'), 'public, max-age=300, s-maxage=1800');
  assert.equal(list.headers.get('cache-tag'), PAGE_TAG);

  const untouched = [
    applyEdgeCacheHeaders(new Response(null, { status: 308, headers: { location: '/x' } }), opts('https://noutorebiyori.com/category/m/abc')),
    applyEdgeCacheHeaders(new Response('x', { status: 404 }), opts('https://noutorebiyori.com/category/m/abc')),
    applyEdgeCacheHeaders(
      new Response('x', { status: 200, headers: { 'cache-control': 'no-store' } }),
      opts('https://noutorebiyori.com/category/m/abc')
    ),
    applyEdgeCacheHeaders(
      new Response('x', { status: 200, headers: { 'set-cookie': 'a=b', 'cache-control': 'public, s-maxage=1' } }),
      opts('https://noutorebiyori.com/category/m/abc')
    ),
    applyEdgeCacheHeaders(page(), opts('https://noutorebiyori.com/category/m/abc', { method: 'POST' })),
    applyEdgeCacheHeaders(page(), opts('https://noutorebiyori.com/category/m/abc', { isDataRequest: true })),
    applyEdgeCacheHeaders(new Response('x', { status: 200, headers: { 'cache-control': 'public, max-age=60' } }), opts('https://noutorebiyori.com/about'))
  ];
  for (const res of untouched) {
    assert.equal(res.headers.get('cache-tag'), null);
    assert.notEqual(res.headers.get('cache-control'), 'public, max-age=60, s-maxage=604800');
  }
});

test('handleCloudflareEdge: 記事は長い s-maxage＋HSTS、UTM 付きはクエリなしのキャッシュを使う', async () => {
  const platform = cfPlatform();
  let renders = 0;
  const resolve = async () => {
    renders++;
    return new Response(`<html>${renders}</html>`, {
      status: 200,
      headers: { 'content-type': 'text/html', 'cache-control': 'public, max-age=60, s-maxage=300' }
    });
  };

  const first = await handleCloudflareEdge({
    event: makeEvent('https://noutorebiyori.com/category/matchstick/abc', { platform }),
    resolve,
    articleTtl: 604800
  });
  assert.equal(first.headers.get('cache-control'), 'public, max-age=60, s-maxage=604800');
  assert.equal(first.headers.get('strict-transport-security'), HSTS_VALUE);
  assert.equal(await first.text(), '<html>1</html>');

  // adapter-cloudflare がクエリなし URL で保存した状態を再現
  platform.cache.store.set(
    'https://noutorebiyori.com/category/matchstick/abc',
    new Response('<html>cached</html>', { headers: { 'cache-control': 'public, max-age=60, s-maxage=604800' } })
  );

  const second = await handleCloudflareEdge({
    event: makeEvent('https://noutorebiyori.com/category/matchstick/abc?utm_source=gunosy', { platform }),
    resolve,
    articleTtl: 604800
  });
  assert.equal(second.headers.get(EDGE_CACHE_STATUS_HEADER), 'HIT-CANONICAL');
  assert.equal(second.headers.get('strict-transport-security'), HSTS_VALUE);
  assert.equal(await second.text(), '<html>cached</html>');
  assert.equal(renders, 1);
});

test('handleCloudflareEdge: www は 308（SvelteKit を呼ばない）', async () => {
  const www = await handleCloudflareEdge({
    event: makeEvent('https://www.noutorebiyori.com/category/a/b?x=1', { platform: cfPlatform() }),
    resolve: async () => assert.fail('resolve must not be called')
  });
  assert.equal(www.status, 308);
  assert.equal(www.headers.get('location'), 'https://noutorebiyori.com/category/a/b?x=1');
  assert.equal(www.headers.get('strict-transport-security'), HSTS_VALUE);
});

test('handleCloudflareEdge: *.workers.dev は noindex、本番ホストには付けない', async () => {
  const staging = await handleCloudflareEdge({
    event: makeEvent('https://noutore-biyori-staging.workers.dev/quiz', { platform: cfPlatform() }),
    resolve: async () => new Response('<html>quiz</html>', { status: 200, headers: { 'content-type': 'text/html' } })
  });
  assert.equal(staging.headers.get('x-robots-tag'), 'noindex');
  assert.equal(staging.headers.get('strict-transport-security'), HSTS_VALUE);

  const prod = await handleCloudflareEdge({
    event: makeEvent('https://noutorebiyori.com/quiz', { platform: cfPlatform() }),
    resolve: async () => new Response('ok', { status: 200 })
  });
  assert.equal(prod.headers.get('x-robots-tag'), null);

  const www = await handleCloudflareEdge({
    event: makeEvent('https://www.noutorebiyori.com/quiz', { platform: cfPlatform() }),
    resolve: async () => assert.fail('resolve must not be called')
  });
  assert.equal(www.status, 308);
  assert.equal(www.headers.get('x-robots-tag'), null);
});

test('handleCloudflareEdge: http（ローカル）では HSTS を付けない', async () => {
  const res = await handleCloudflareEdge({
    event: makeEvent('http://localhost:8787/about', { platform: cfPlatform() }),
    resolve: async () => new Response('ok')
  });
  assert.equal(res.headers.get('strict-transport-security'), null);
});

test('buildPurgeUrls: 複数オリジン × パス、重複除去', () => {
  const urls = buildPurgeUrls(['/', '/quiz', '/quiz', 'bad'], [
    'https://noutorebiyori.com',
    'https://noutorebiyori.com',
    'https://noutore-biyori.example.workers.dev'
  ]);
  assert.deepEqual(urls, [
    'https://noutorebiyori.com/',
    'https://noutore-biyori.example.workers.dev/',
    'https://noutorebiyori.com/quiz',
    'https://noutore-biyori.example.workers.dev/quiz'
  ]);
});

test('purgeCloudflareUrls: ローカル削除＋ゾーン purge を分割送信（トークンは本文に含めない）', async () => {
  const platform = cfPlatform();
  platform.cache.store.set('https://noutorebiyori.com/category/a/b', new Response('x'));
  const urls = ['https://noutorebiyori.com/category/a/b'];
  for (let i = 0; i < PURGE_BATCH_SIZE + 5; i++) urls.push(`https://noutorebiyori.com/p${i}`);

  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  };
  const outcome = await purgeCloudflareUrls({
    platform,
    urls,
    tags: ['quiz-abc', PAGE_TAG, 'quiz-abc'],
    zoneId: 'zone123',
    apiToken: 'dummy-token-for-test',
    fetchImpl
  });
  assert.equal(outcome.local, 1);
  assert.equal(outcome.zone, 'ok');
  assert.deepEqual(outcome.errors, []);
  // URL 36 件 → 30 + 6 の2回、タグ（重複除去で2件）→ 1回
  assert.equal(calls.length, 3);
  assert.equal(calls[0].url, 'https://api.cloudflare.com/client/v4/zones/zone123/purge_cache');
  assert.equal(JSON.parse(calls[0].init.body).files.length, PURGE_BATCH_SIZE);
  assert.equal(JSON.parse(calls[1].init.body).files.length, 6);
  assert.deepEqual(JSON.parse(calls[2].init.body), { tags: ['quiz-abc', PAGE_TAG] });
  assert.equal(calls[0].init.headers.authorization, 'Bearer dummy-token-for-test');
  assert.ok(!calls[0].init.body.includes('dummy-token-for-test'));
});

test('purgeCloudflareUrls: 設定なしは skipped、API 失敗は failed', async () => {
  const skipped = await purgeCloudflareUrls({ platform: cfPlatform(), urls: ['https://noutorebiyori.com/'] });
  assert.equal(skipped.zone, 'skipped');

  const failed = await purgeCloudflareUrls({
    platform: cfPlatform(),
    urls: ['https://noutorebiyori.com/'],
    zoneId: 'z',
    apiToken: 't',
    fetchImpl: async () =>
      new Response(JSON.stringify({ success: false, errors: [{ message: 'Authentication error' }] }), { status: 403 })
  });
  assert.equal(failed.zone, 'failed');
  assert.match(failed.errors[0], /HTTP 403 Authentication error/);
});

test('resolveSiteOrigin / resolveIndexNowBase: 本番ドメインを基点にする', () => {
  assert.equal(resolveSiteOrigin(undefined), 'https://noutorebiyori.com');
  assert.equal(resolveSiteOrigin('https://noutorebiyori.com/'), 'https://noutorebiyori.com');
  assert.equal(resolveSiteOrigin('not a url'), 'https://noutorebiyori.com');
  assert.equal(resolveSiteOrigin('http://noutorebiyori.com'), 'https://noutorebiyori.com');

  assert.equal(resolveIndexNowBase(undefined), 'https://noutorebiyori.com');
  assert.equal(resolveIndexNowBase('https://noutorebiyori.com'), 'https://noutorebiyori.com');
  // vercel.app / workers.dev は IndexNow の host と一致しないので本番ドメインに戻す
  assert.equal(resolveIndexNowBase('https://noutore-biyori.vercel.app'), 'https://noutorebiyori.com');
  assert.equal(resolveIndexNowBase('https://noutore-biyori.example.workers.dev'), 'https://noutorebiyori.com');
});
