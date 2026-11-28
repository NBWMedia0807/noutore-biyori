import { SANITY_IMAGE_FILE, SANITY_IMAGE_PATH } from '../utils/imageProxy.js';

const TTL = 31536000;
const PROXY_PATH = `/img${SANITY_IMAGE_PATH}`;

function formatBucket(accept) {
  const supported = accept.toLowerCase().split(',').map((range) => {
    const [type, ...params] = range.trim().split(';');
    const quality = params.find((param) => /^\s*q\s*=/.test(param));
    return !quality || Number(quality.split('=')[1]) > 0 ? type.trim() : '';
  });
  if (supported.includes('image/avif')) return 'avif';
  if (supported.includes('image/webp')) return 'webp';
  return 'other';
}

export async function handleImageProxy(request, {
  cache = globalThis.caches?.default,
  fetch = globalThis.fetch,
  waitUntil
} = {}) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/img/')) return undefined;
  if (
    !['GET', 'HEAD'].includes(request.method) ||
    !url.pathname.startsWith(PROXY_PATH) ||
    !SANITY_IMAGE_FILE.test(url.pathname.slice(PROXY_PATH.length))
  ) return new Response(null, { status: 404, headers: { 'cache-control': 'no-store' } });

  const negotiate = url.searchParams.getAll('auto').includes('format') && !url.searchParams.has('fm');
  const bucket = negotiate ? formatBucket(request.headers.get('accept') ?? '') : 'fixed';
  const accept = bucket === 'other' ? '*/*' : `image/${bucket}`;
  // Keep the bucket outside the user-controlled query string.
  const key = new Request(`${url.origin}/_sanity-image-cache/v1/${bucket}${url.pathname}${url.search}`);
  const cached = await cache?.match(key).catch(() => undefined);
  const response = cached ?? await fetch(`https://cdn.sanity.io${url.pathname.slice(4)}${url.search}`, {
    redirect: 'manual',
    ...(negotiate ? {
      headers: { accept },
      cache: 'no-store'
    } : {
      cf: {
        cacheEverything: true,
        cacheTtl: TTL,
        cacheTtlByStatus: { '200': TTL, '201-599': -1 }
      }
    })
  });

  const headers = new Headers(response.headers);
  headers.delete('set-cookie');
  headers.set('cache-control', response.status === 200 ? `public, max-age=${TTL}, immutable` : 'no-store');
  headers.set('x-image-proxy', cached ? 'hit' : 'miss');
  if (negotiate) headers.set('vary', 'Accept');

  const result = new Response(response.body, { status: response.status, headers });
  if (!cached && response.status === 200 && cache) {
    const store = cache.put(key, result.clone()).catch(() => {});
    if (waitUntil) waitUntil(store);
    else await store;
  }
  if (request.method === 'HEAD') {
    result.body?.cancel().catch(() => {});
    return new Response(null, { status: result.status, headers });
  }
  return result;
}
