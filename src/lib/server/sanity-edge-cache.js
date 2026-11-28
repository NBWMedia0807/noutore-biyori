const FRESH_SECONDS = 600;
const EMPTY_FRESH_SECONDS = 60;
const RETENTION_SECONDS = 7 * 24 * 60 * 60;
const TIMESTAMP = 'x-sanity-cached-at';
export const SANITY_EDGE_CACHE_KEY_PREFIX = 'https://noutorebiyori.com/__sanity-edge-cache/v1/';

// Options that alter transport, credentials or response shape use the original client.
const cacheableOptions = new Set(['perspective', 'filterResponse', 'edgeCache', 'tag']);

async function cacheKey({ projectId, dataset, apiVersion, perspective }, query, params) {
  const data = JSON.stringify({ projectId, dataset, apiVersion, perspective, query, params });
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  const hex = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return new Request(`${SANITY_EDGE_CACHE_KEY_PREFIX}${hex}`);
}

export function createSanityEdgeFetch({
  fetch,
  config,
  getCache = () => globalThis.caches?.default,
  now = Date.now,
  ttlSeconds = FRESH_SECONDS,
  waitUntil
}) {
  const inFlight = new Map();
  const freshSeconds = Number(ttlSeconds) > 0 ? Number(ttlSeconds) : FRESH_SECONDS;

  return async (...args) => {
    const [query, params, options] = args;
    const read = () => fetch(...args);
    let cache;
    let key;
    let stale;
    try {
      cache = getCache();
      if (!cache) return read();

      const settings = config();
      const perspective = options?.perspective ?? settings.perspective;
      if (
        (settings.perspective !== undefined && settings.perspective !== 'published') ||
        (perspective !== undefined && perspective !== 'published') ||
        options?.filterResponse === false ||
        options?.edgeCache === false ||
        Object.keys(options ?? {}).some((option) => !cacheableOptions.has(option))
      ) return read();

      key = await cacheKey({ ...settings, perspective }, query, params ?? {});
      const cached = await cache.match(key);
      if (cached?.ok && cached.headers.has(TIMESTAMP)) {
        const age = now() - Number(cached.headers.get(TIMESTAMP));
        if (age >= 0 && age < RETENTION_SECONDS * 1000) {
          stale = await cached.json();
          const empty = stale === null || (Array.isArray(stale) && stale.length === 0);
          if (age < (empty ? Math.min(freshSeconds, EMPTY_FRESH_SECONDS) : freshSeconds) * 1000) {
            return stale;
          }
        }
      }
    } catch {
      return read();
    }

    let refresh = inFlight.get(key.url);
    if (!refresh) {
      refresh = Promise.resolve().then(async () => {
        const result = await read();
        try {
          await cache.put(key, Response.json(result, {
            headers: {
              'cache-control': `public, max-age=${RETENTION_SECONDS}`,
              [TIMESTAMP]: String(now())
            }
          }));
        } catch {
          // The origin result is still usable if serialization or storage fails.
        }
        return result;
      }).finally(() => inFlight.delete(key.url));
      inFlight.set(key.url, refresh);
    }

    if (stale !== undefined && waitUntil) {
      try {
        waitUntil(refresh.catch(() => {}));
        return stale;
      } catch {
        // With no usable request context, refresh inline.
      }
    }
    try {
      return structuredClone(await refresh);
    } catch (error) {
      if (stale !== undefined) return stale;
      throw error;
    }
  };
}

export function withSanityEdgeCache(client, options) {
  client.fetch = createSanityEdgeFetch({
    ...options,
    fetch: client.fetch.bind(client),
    config: () => client.config()
  });
  return client;
}
