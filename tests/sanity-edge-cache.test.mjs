import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSanityEdgeFetch } from '../src/lib/server/sanity-edge-cache.js';

const config = { projectId: 'quljge22', dataset: 'production', apiVersion: '2024-01-01', perspective: 'published' };

function fixture(t, options = {}) {
  const entries = new Map();
  const cache = {
    async match(key) { return entries.get(key.url)?.clone(); },
    async put(key, response) { entries.set(key.url, response); }
  };
  const clock = { now: 0 };
  const origin = t.mock.fn(options.fetch ?? (async () => [{ title: 'Quiz' }]));
  const read = createSanityEdgeFetch({
    config: () => config,
    getCache: () => cache,
    now: () => clock.now,
    ...options,
    fetch: origin
  });
  return { read, origin, entries, cache, clock };
}

test('fresh reads hit and retention is seven days', async (t) => {
  const { read, origin, clock, entries } = fixture(t);
  const first = await read('*', { slug: 'a' });
  clock.now = 599_999;
  assert.deepEqual(await read('*', { slug: 'a' }), first);
  assert.equal(origin.mock.callCount(), 1);
  assert.equal([...entries.values()][0].headers.get('cache-control'), 'public, max-age=604800');
  await read('*', { slug: 'b' });
  assert.equal(origin.mock.callCount(), 2);
});

test('stale data is served while waitUntil refreshes it', async (t) => {
  const background = [];
  let version = 1;
  const { read, origin, clock } = fixture(t, {
    fetch: async () => ({ version }),
    waitUntil: (task) => background.push(task)
  });
  assert.deepEqual(await read('*'), { version: 1 });
  clock.now = 600_000;
  version = 2;
  assert.deepEqual(await read('*'), { version: 1 });
  await Promise.all(background);
  assert.equal(background.length, 1);
  assert.deepEqual(await read('*'), { version: 2 });
  assert.equal(origin.mock.callCount(), 2);
});

test('inline refresh returns stale on 402, and expired entries are not served', async (t) => {
  const error = new Error('402');
  let unavailable = false;
  const { read, clock } = fixture(t, {
    fetch: async () => {
      if (unavailable) throw error;
      return [1];
    }
  });
  await read('*');
  clock.now = 600_000;
  unavailable = true;
  assert.deepEqual(await read('*'), [1]);
  clock.now = 604_800_000;
  await assert.rejects(read('*'), error);
});

for (const empty of [null, []]) {
  test(`empty result ${JSON.stringify(empty)} is fresh for one minute`, async (t) => {
    const { read, origin, clock } = fixture(t, { fetch: async () => empty });
    await read('*');
    clock.now = 59_999;
    assert.deepEqual(await read('*'), empty);
    assert.equal(origin.mock.callCount(), 1);
    clock.now++;
    await read('*');
    assert.equal(origin.mock.callCount(), 2);
  });
}

test('preview, opt-outs, and unfiltered responses pass their arguments through', async (t) => {
  const { read, origin, entries } = fixture(t);
  for (const options of [
    { perspective: 'previewDrafts' }, { perspective: 'drafts' }, { perspective: ['release'] },
    { cache: 'no-store' }, { edgeCache: false }, { filterResponse: false }
  ]) {
    await read('*', {}, options);
    assert.equal(origin.mock.calls.at(-1).arguments[2], options);
  }
  assert.equal(entries.size, 0);
  const preview = fixture(t, { config: () => ({ ...config, perspective: 'previewDrafts' }) });
  await preview.read('*', {}, { perspective: 'published' });
  assert.equal(preview.entries.size, 0);
});

test('concurrent misses share an origin read and a later refresh can start', async (t) => {
  let finishRead;
  const pendingRead = new Promise((resolve) => { finishRead = resolve; });
  const { read, clock, origin, cache } = fixture(t, { fetch: () => pendingRead });
  let matchCount = 0;
  let bothMatched;
  const matches = new Promise((resolve) => { bothMatched = resolve; });
  const match = cache.match;
  cache.match = async (key) => {
    if (++matchCount === 2) bothMatched();
    return match(key);
  };
  const first = read('*');
  const second = read('*');
  await matches;
  await Promise.resolve();
  assert.equal(origin.mock.callCount(), 1);
  finishRead([{ title: 'Quiz' }]);
  const [firstResult, secondResult] = await Promise.all([first, second]);
  firstResult[0].title = 'Changed';
  assert.deepEqual(secondResult, [{ title: 'Quiz' }]);
  clock.now = 600_000;
  await read('*');
  assert.equal(origin.mock.callCount(), 2);
});

test('credentials in client config do not affect the key or enter the stored response', async (t) => {
  const first = fixture(t, { config: () => ({ ...config, token: 'test-placeholder-a' }) });
  const second = fixture(t, { config: () => ({ ...config, token: 'test-placeholder-b' }) });
  await first.read('*', { slug: 'a' });
  await second.read('*', { slug: 'a' });
  const [key, response] = [...first.entries][0];
  assert.match(key, /^https:\/\/noutorebiyori\.com\/__sanity-edge-cache\/v1\/[a-f0-9]{64}$/);
  assert.deepEqual([...first.entries.keys()], [...second.entries.keys()]);
  assert.deepEqual(await response.json(), [{ title: 'Quiz' }]);
});

test('cache exceptions fall back to origin and failed writes keep the successful result', async (t) => {
  const { read, origin, cache } = fixture(t);
  cache.match = async () => { throw new Error('cache read'); };
  assert.deepEqual(await read('*'), [{ title: 'Quiz' }]);
  cache.match = async () => undefined;
  cache.put = async () => { throw new Error('cache write'); };
  assert.deepEqual(await read('*'), [{ title: 'Quiz' }]);
  assert.equal(origin.mock.callCount(), 2);
});

test('no Workers cache means direct reads', async (t) => {
  const { read, origin } = fixture(t, { getCache: () => undefined });
  await read('*');
  await read('*');
  assert.equal(origin.mock.callCount(), 2);
});
