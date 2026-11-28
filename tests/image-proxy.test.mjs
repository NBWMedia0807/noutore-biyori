import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';
import { handleImageProxy } from '../src/lib/server/image-proxy.js';
import { toProxiedSanityImageUrl } from '../src/lib/utils/imageProxy.js';

const file = `${'a'.repeat(40)}-1600x900.jpg`;
const path = `/images/quljge22/production/${file}`;
const cdn = `https://cdn.sanity.io${path}`;
const proxy = `https://noutorebiyori.com/img${path}`;

function fixture(t, status = 200) {
  const entries = new Map();
  const tasks = [];
  const cache = {
    async match(key) {
      assert.equal(key.method, 'GET');
      return entries.get(key.url)?.clone();
    },
    async put(key, response) {
      entries.set(key.url, new Response(await response.arrayBuffer(), response));
    }
  };
  const fetch = t.mock.fn(async (_url, options) => new Response('image bytes', {
    status,
    headers: {
      'content-type': options.headers?.accept === 'image/avif' ? 'image/avif' : 'image/jpeg',
      'set-cookie': 'example=placeholder'
    }
  }));
  const handle = (url, init) => handleImageProxy(new Request(url, init), {
    cache, fetch, waitUntil: (task) => tasks.push(task)
  });
  return { handle, fetch, flush: () => Promise.all(tasks) };
}

test('only valid project paths and GET/HEAD reach Sanity', async (t) => {
  const { handle, fetch } = fixture(t);
  assert.equal(await handle('https://noutorebiyori.com/quiz'), undefined);
  for (const url of [
    proxy.replace('quljge22', 'other'), proxy.replace('production', 'drafts'),
    proxy.replace(file, 'https%3A%2F%2Fevil.example'), proxy.replace('.jpg', '.html'), proxy + '/extra'
  ]) assert.equal((await handle(url)).status, 404);
  assert.equal((await handle(proxy, { method: 'POST' })).status, 404);
  assert.equal(fetch.mock.callCount(), 0);
});

test('200 misses are cached with the original query and GET entries serve HEAD', async (t) => {
  const { handle, fetch, flush } = fixture(t);
  const query = '?w=640&q=80';
  const miss = await handle(proxy + query);
  assert.equal(miss.headers.get('x-image-proxy'), 'miss');
  assert.equal(miss.headers.get('set-cookie'), null);
  assert.equal(miss.headers.get('content-type'), 'image/jpeg');
  assert.equal(miss.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  assert.equal(await miss.text(), 'image bytes');
  await flush();
  const hit = await handle(proxy + query, { method: 'HEAD' });
  assert.equal(hit.headers.get('x-image-proxy'), 'hit');
  assert.equal(await hit.text(), '');
  assert.equal(fetch.mock.callCount(), 1);
  const [upstream, options] = fetch.mock.calls[0].arguments;
  assert.equal(upstream, cdn + query);
  assert.equal(options.cf.cacheEverything, true);
  assert.equal(options.cf.cacheTtl, 31536000);
});

test('auto=format separates normalized Accept buckets and sends Vary', async (t) => {
  const { handle, fetch, flush } = fixture(t);
  const url = proxy + '?auto=format';
  for (const [accept, normalized] of [
    ['image/avif,image/webp,*/*', 'image/avif'],
    ['image/avif;q=0,image/webp', 'image/webp'],
    ['image/png', '*/*']
  ]) {
    const response = await handle(url, { headers: { accept } });
    assert.equal(response.headers.get('x-image-proxy'), 'miss');
    assert.equal(response.headers.get('vary'), 'Accept');
    assert.deepEqual(fetch.mock.calls.at(-1).arguments[1], {
      redirect: 'manual',
      headers: { accept: normalized },
      cache: 'no-store'
    });
    await flush();
  }
  const avif = await handle(url, { headers: { accept: 'image/avif' } });
  assert.equal(avif.headers.get('x-image-proxy'), 'hit');
  assert.equal(avif.headers.get('content-type'), 'image/avif');
  assert.equal(fetch.mock.callCount(), 3);
});

test('fm= requests share a cache entry across Accept headers', async (t) => {
  const { handle, fetch, flush } = fixture(t);
  const url = proxy + '?auto=format&fm=webp';
  const first = await handle(url, { headers: { accept: 'image/avif' } });
  assert.equal(first.headers.get('vary'), null);
  await flush();
  const next = await handle(url, { headers: { accept: 'image/webp' } });
  assert.equal(next.headers.get('x-image-proxy'), 'hit');
  assert.equal(fetch.mock.callCount(), 1);
  assert.deepEqual(fetch.mock.calls[0].arguments[1], {
    redirect: 'manual',
    cf: {
      cacheEverything: true,
      cacheTtl: 31536000,
      cacheTtlByStatus: { '200': 31536000, '201-599': -1 }
    }
  });
});

test('upstream errors keep their status and are not cached', async (t) => {
  const { handle, fetch, flush } = fixture(t, 402);
  for (let i = 0; i < 2; i++) {
    const response = await handle(proxy);
    assert.equal(response.status, 402);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    await flush();
  }
  assert.equal(fetch.mock.callCount(), 2);
});

test('URL generation defaults off and maps valid asset URLs only with the flag enabled', () => {
  const query = '?w=640&auto=format';
  assert.equal(toProxiedSanityImageUrl(cdn + query), cdn + query);
  assert.equal(toProxiedSanityImageUrl(cdn + query, 'off'), cdn + query);
  for (const flag of ['on', '1', 'true']) {
    assert.equal(toProxiedSanityImageUrl(cdn + query, flag), proxy + query);
    const other = cdn.replace('quljge22', 'other');
    assert.equal(toProxiedSanityImageUrl(other, flag), other);
  }
});

test('build flag maps the resized OG and JSON-LD image and preserves dimensions', async () => {
  // Simulate Vite's build-time env substitution for the Node import.
  const loader = `
    export async function resolve(specifier, context, next) {
      const resolved = await next(specifier, context);
      if (resolved.url.endsWith('/utils/imageProxy.js')) resolved.url += '?proxy-on';
      return resolved;
    }
    export async function load(url, context, next) {
      const result = await next(url, context);
      if (url.endsWith('/utils/imageProxy.js?proxy-on')) {
        result.source = result.source.toString().replace('import.meta.env?.VITE_SANITY_IMAGE_PROXY', '"on"');
      }
      return result;
    }
  `;
  register('data:text/javascript,' + encodeURIComponent(loader), import.meta.url);
  const { createPageSeo } = await import('../src/lib/seo.js');
  const seo = createPageSeo({ image: cdn + '?w=320&h=180', article: { title: 'Quiz' } });
  const expected = proxy + '?w=1280&h=720&fit=max&fm=webp&q=80';
  assert.equal(seo.image, expected);
  assert.equal(seo.imageWidth, 1280);
  assert.equal(seo.imageHeight, 720);
  const article = seo.jsonld.find((item) => item?.['@type'] === 'NewsArticle');
  assert.deepEqual(article.image, [{ '@type': 'ImageObject', url: expected, width: 1280, height: 720 }]);
});
