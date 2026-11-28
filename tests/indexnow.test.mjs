import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';

import {
  MAX_DRAIN_MS,
  buildIndexNowRequestBody,
  createIndexNowScheduler,
  parseRetryAfterMs,
} from '../src/lib/server/indexnow-queue.js';
import {
  buildQuizIndexNowUrls,
  isIndexNowEligibleQuiz,
} from '../src/lib/server/indexnow-visibility.js';
import { isFutureScheduled, resolvePublishInfo } from '../src/lib/utils/publishedDate.js';

const NOW = Date.parse('2026-11-22T04:00:00.000Z');

test('date-only publishedAt uses the same UTC midnight instant as the page', () => {
  const dateOnly = '2026-11-23';
  const timestamp = resolvePublishInfo({ publishedAt: dateOnly }).timestamp;
  assert.equal(timestamp, Date.parse('2026-11-23T00:00:00.000Z'));
  assert.equal(
    isFutureScheduled('2099-01-01'),
    Date.parse('2099-01-01T00:00:00.000Z') > Date.now()
  );
  assert.equal(
    isIndexNowEligibleQuiz(
      { publishedAt: dateOnly, _createdAt: '2020-01-01T00:00:00.000Z', slug: 'tomorrow' },
      NOW
    ),
    false
  );
  assert.equal(
    isIndexNowEligibleQuiz({ publishedAt: dateOnly, slug: 'tomorrow' }, timestamp),
    true
  );
  assert.equal(
    isIndexNowEligibleQuiz({ publishedAt: dateOnly, slug: 'tomorrow' }, timestamp - 1),
    false
  );
});

test('future, missing, draft, and unapproved quizzes are not submitted', () => {
  const quizzes = [
    { slug: 'live', publishedAt: '2026-11-22T00:00:00.000Z', reviewStatus: 'approved' },
    {
      slug: 'scheduled',
      publishedAt: '2026-11-23T01:00:00.000Z',
      _createdAt: '2026-11-01T00:00:00.000Z',
    },
    { slug: 'date-only', publishedAt: '2026-11-23' },
    { slug: 'no-date', reviewStatus: 'approved' },
    { slug: 'draft', _id: 'drafts.abc', publishedAt: '2026-11-01T00:00:00.000Z' },
    { slug: 'held', publishedAt: '2026-11-01T00:00:00.000Z', reviewStatus: 'needs_review' },
    { slug: 'legacy', _createdAt: '2026-11-01T00:00:00.000Z' },
  ];
  const { urls, skipped } = buildQuizIndexNowUrls('https://noutorebiyori.com/', quizzes, NOW);
  assert.deepEqual(urls, [
    'https://noutorebiyori.com/quiz/live',
    'https://noutorebiyori.com/quiz/live/answer',
    'https://noutorebiyori.com/quiz/legacy',
    'https://noutorebiyori.com/quiz/legacy/answer',
  ]);
  assert.deepEqual(skipped, ['scheduled', 'date-only', 'no-date', 'draft', 'held']);
});

test('IndexNow body is one host-matched url list', () => {
  const body = buildIndexNowRequestBody({
    urls: ['https://noutorebiyori.com/quiz/a', 'https://noutorebiyori.com/quiz/a/answer'],
    key: 'index-key',
    siteUrl: 'https://noutorebiyori.com',
  });
  assert.equal(body.host, 'noutorebiyori.com');
  assert.equal(body.keyLocation, 'https://noutorebiyori.com/index-key.txt');
  assert.equal(body.urlList.length, 2);
});

test('retry-after accepts seconds and caps long delays', () => {
  const now = Date.parse('2026-11-22T00:00:00.000Z');
  assert.equal(parseRetryAfterMs('30', now, { defaultMs: 1000, maxMs: 50_000 }), 30_000);
  assert.equal(parseRetryAfterMs('120', now, { defaultMs: 1000, maxMs: 50_000 }), 50_000);
  assert.equal(parseRetryAfterMs('', now, { defaultMs: 1000, maxMs: 50_000 }), 1000);
  assert.equal(
    parseRetryAfterMs('Sun, 22 Nov 2026 00:00:10 GMT', now, { defaultMs: 1000, maxMs: 50_000 }),
    10_000
  );
});

const schedulerAt = (clock, overrides = {}) =>
  createIndexNowScheduler({
    now: () => clock.now,
    sleep: async (ms) => {
      clock.now += ms;
    },
    dedupeWindowMs: 10 * 60 * 1000,
    minIntervalMs: 10 * 1000,
    flushDelayMs: 0,
    defaultBackoffMs: 60 * 1000,
    maxBackoffMs: 10 * 60 * 1000,
    ...overrides,
  });

test('a burst is one submission, repeats are dropped, and 429 backs off without throwing', async () => {
  const clock = { now: NOW };
  const scheduler = schedulerAt(clock);
  const calls = [];
  const submit = async (batch) => {
    calls.push([...batch]);
    if (calls.length === 1) return { ok: false, status: 429, retryAfter: '30' };
    return { ok: true, status: 200 };
  };

  scheduler.enqueue([
    'https://noutorebiyori.com/quiz/a',
    'https://noutorebiyori.com/quiz/a/answer',
  ]);
  scheduler.enqueue([
    'https://noutorebiyori.com/quiz/a',
    'https://noutorebiyori.com/quiz/b',
    'https://noutorebiyori.com/quiz/b/answer',
  ]);

  const first = await scheduler.kick(submit);
  assert.equal(first.ok, true);
  assert.equal(first.throttled, true);
  assert.equal(first.status, 429);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], [
    'https://noutorebiyori.com/quiz/a',
    'https://noutorebiyori.com/quiz/a/answer',
    'https://noutorebiyori.com/quiz/b',
    'https://noutorebiyori.com/quiz/b/answer',
  ]);

  const duringBackoff = await scheduler.kick(submit);
  assert.equal(duringBackoff.reason, 'backoff');
  assert.equal(calls.length, 1);

  clock.now += 30_000;
  const after = await scheduler.kick(submit);
  assert.equal(after.ok, true);
  assert.equal(after.submitted, 4);
  assert.equal(calls.length, 2);

  const repeated = scheduler.enqueue(calls[1]);
  assert.equal(repeated.accepted.length, 0);
  assert.equal(repeated.deduped.length, 4);
  const skipped = await scheduler.kick(submit);
  assert.equal(skipped.reason, 'empty');
  assert.equal(calls.length, 2);
});

test('a url that arrives inside the minimum interval is sent after that wait', async () => {
  const clock = { now: NOW };
  const scheduler = schedulerAt(clock);
  const calls = [];
  const submit = async (batch) => {
    calls.push([...batch]);
    return { ok: true, status: 200 };
  };

  scheduler.enqueue(['https://noutorebiyori.com/quiz/a']);
  await scheduler.kick(submit);
  scheduler.enqueue(['https://noutorebiyori.com/quiz/b']);
  const second = await scheduler.kick(submit);

  assert.equal(second.submitted, 1);
  assert.deepEqual(calls, [
    ['https://noutorebiyori.com/quiz/a'],
    ['https://noutorebiyori.com/quiz/b'],
  ]);
  assert.ok(clock.now - NOW >= 10_000);
});

const url = (name) => `https://noutorebiyori.com/quiz/${name}`;
const accept = (calls) => async (batch) => {
  calls.push([...batch]);
  return { ok: true, status: 200 };
};
const settleMicrotasks = () => new Promise((resolve) => setImmediate(resolve));

test('the interval wait is handed to waitUntil', async () => {
  const clock = { now: NOW };
  const scheduler = schedulerAt(clock);
  const calls = [];
  const held = [];
  for (const name of ['a', 'b']) {
    scheduler.enqueue([url(name)]);
    scheduler.kick(accept(calls), (promise) => held.push(promise));
    await held.at(-1);
  }
  assert.equal(held.length, 2);
  assert.deepEqual(calls, [[url('a')], [url('b')]]);
});

test('a wait beyond the budget keeps the url for the next kick', async () => {
  const clock = { now: NOW };
  const scheduler = schedulerAt(clock, { minIntervalMs: 40_000 });
  const calls = [];
  scheduler.enqueue([url('a')]);
  await scheduler.kick(accept(calls));

  scheduler.enqueue([url('b')]);
  const startedAt = clock.now;
  const left = await scheduler.kick(accept(calls));
  assert.equal(left.reason, 'budget');
  assert.equal(clock.now, startedAt);
  assert.equal(scheduler.pendingCount(), 1);

  clock.now += 40_000;
  assert.equal((await scheduler.kick(accept(calls))).submitted, 1);
  assert.deepEqual(calls, [[url('a')], [url('b')]]);
});

test('waiting plus sending stays under 25 seconds even while urls keep arriving', async () => {
  assert.ok(MAX_DRAIN_MS < 25_000);
  for (const sendMs of [0, 1000, 4000]) {
    const clock = { now: NOW };
    const scheduler = schedulerAt(clock, { flushDelayMs: 500 });
    let count = 0;
    scheduler.enqueue([url('first')]);
    const submit = async () => {
      clock.now += sendMs;
      count += 1;
      scheduler.enqueue([url(`next-${count}`)]);
      return { ok: true, status: 200 };
    };

    const result = await scheduler.kick(submit);

    assert.ok(clock.now - NOW <= MAX_DRAIN_MS, `${sendMs}: ${clock.now - NOW}`);
    assert.equal(result.reason, 'budget');
    assert.equal(scheduler.pendingCount(), 1);
  }
});

test('a long Retry-After is recorded and never slept', async () => {
  const clock = { now: NOW };
  const slept = [];
  const scheduler = schedulerAt(clock, {
    sleep: async (ms) => {
      slept.push(ms);
      clock.now += ms;
    },
  });
  let calls = 0;
  const submit = async () => {
    calls += 1;
    return { ok: false, status: 429, retryAfter: '300' };
  };
  scheduler.enqueue([url('a')]);

  assert.equal((await scheduler.kick(submit)).throttled, true);
  const again = await scheduler.kick(submit);

  assert.equal(again.retryAt, NOW + 300_000);
  assert.equal(calls, 1);
  assert.deepEqual([...new Set(slept)], [0]);
});

test('a drain cancelled while waiting does not block the next kick', async () => {
  const clock = { now: NOW };
  let cancelled = false;
  const scheduler = schedulerAt(clock, {
    sleep: async (ms) => {
      if (cancelled) await new Promise(() => {});
      clock.now += ms;
    },
  });
  const calls = [];
  scheduler.enqueue([url('a')]);

  // Workers の打ち切りと同じく、解決も reject もしない。
  cancelled = true;
  const dead = scheduler.kick(accept(calls));
  await settleMicrotasks();
  cancelled = false;
  const next = scheduler.kick(accept(calls));

  assert.notEqual(next, dead);
  assert.equal((await next).submitted, 1);
  assert.deepEqual(calls, [[url('a')]]);
});

test('a drain cancelled while sending releases active and gives the urls back', async (t) => {
  // 打ち切られたリクエストの timer は発火しない。
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const clock = { now: NOW };
  const scheduler = schedulerAt(clock);
  scheduler.enqueue([url('a')]);
  scheduler.kick(() => new Promise(() => {}));
  await settleMicrotasks();
  assert.equal(scheduler.pendingCount(), 0);

  scheduler.enqueue([url('b')]);
  const calls = [];
  const result = await scheduler.kick(accept(calls));

  assert.equal(result.submitted, 2);
  assert.deepEqual(calls, [[url('a'), url('b')]]);
  assert.ok(clock.now - NOW <= MAX_DRAIN_MS);
});

test('the same url re-enqueued after a cancelled send is sent again', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const clock = { now: NOW };
  const scheduler = schedulerAt(clock);
  scheduler.enqueue([url('a')]);
  scheduler.kick(() => new Promise(() => {}));
  await settleMicrotasks();

  assert.equal(scheduler.enqueue([url('a')]).accepted.length, 0);
  clock.now += 30_000;
  scheduler.enqueue([url('a')]);
  assert.equal(scheduler.pendingCount(), 1);

  const calls = [];
  await scheduler.kick(accept(calls));
  assert.deepEqual(calls, [[url('a')]]);
});

test('a send that never answers is aborted by its own timeout', async () => {
  const clock = { now: NOW };
  const scheduler = schedulerAt(clock, { submitTimeoutMs: 20 });
  scheduler.enqueue([url('a')]);
  let signal;
  // テストプロセスを生かしておくための timer。
  const keepAlive = setTimeout(() => {}, 1000);
  const result = await scheduler.kick((batch, options) => {
    signal = options.signal;
    return new Promise(() => {});
  });
  clearTimeout(keepAlive);

  assert.equal(result.reason, 'error-backoff');
  assert.equal(signal.aborted, true);
  assert.equal(scheduler.pendingCount(), 1);

  clock.now += 60_000;
  assert.equal((await scheduler.kick(accept([]))).submitted, 1);
});

test('active is cleared after a thrown send', async () => {
  const clock = { now: NOW };
  const scheduler = schedulerAt(clock);
  scheduler.enqueue([url('a')]);
  const failed = await scheduler.kick(() => {
    throw new Error('boom');
  });
  assert.equal(failed.reason, 'error-backoff');

  clock.now += 60_000;
  const startedAt = clock.now;
  assert.equal((await scheduler.kick(accept([]))).submitted, 1);
  assert.equal(clock.now, startedAt);
});

test('overlapping kicks send one batch', async () => {
  const scheduler = schedulerAt({ now: NOW });
  const calls = [];
  scheduler.enqueue([url('a')]);
  const first = scheduler.kick(accept(calls));
  scheduler.enqueue([url('b')]);
  const second = scheduler.kick(accept(calls));
  await Promise.all([first, second]);

  assert.notEqual(first, second);
  assert.deepEqual(calls, [[url('a'), url('b')]]);
});

for (const status of [400, 403, 422]) {
  test(`${status} drops only the bad url and does not jam the batch`, async () => {
    const clock = { now: NOW };
    const scheduler = schedulerAt(clock);
    const sent = [];
    const submit = async (batch) => {
      if (batch.includes(url('bad'))) return { ok: false, status };
      sent.push(...batch);
      return { ok: true, status: 200 };
    };
    scheduler.enqueue(['a', 'bad', 'b', 'c'].map(url));

    for (let kicks = 0; kicks < 5 && scheduler.pendingCount() > 0; kicks += 1) {
      const startedAt = clock.now;
      await scheduler.kick(submit);
      assert.ok(clock.now - startedAt <= MAX_DRAIN_MS);
    }

    assert.equal(scheduler.pendingCount(), 0);
    assert.deepEqual(sent, [url('a'), url('b'), url('c')]);
  });
}

test('new urls go before the urls of a rejected batch', async () => {
  const clock = { now: NOW };
  const scheduler = schedulerAt(clock);
  const bad = Array.from({ length: 20 }, (_, index) => url(`bad-${index}`));
  const submit = async (batch) =>
    batch.some((item) => bad.includes(item)) ? { ok: false, status: 422 } : { ok: true };
  scheduler.enqueue(bad);
  await scheduler.kick(submit);
  assert.ok(scheduler.pendingCount() > 1);

  scheduler.enqueue([url('new')]);
  const calls = [];
  await scheduler.kick(async (batch) => {
    calls.push([...batch]);
    return submit(batch);
  });
  assert.deepEqual(calls[0], [url('new')]);
});

// revalidate のルートを、SvelteKit・Sanity・通信なしで読み込む。
const loadRevalidateRoute = async () => {
  const stubs = {
    '$env/dynamic/private': "export const env = { SANITY_REVALIDATE_SECRET: 'test-secret' };",
    '$env/dynamic/public': 'export const env = {};',
    '@sveltejs/kit':
      'export const json = (body, init) => new Response(JSON.stringify(body), init);',
    '$lib/sanity.server.js':
      'export const client = {}; export const shouldSkipSanityFetch = () => true;',
    '$lib/config/site.js': "export const SITE = { url: 'https://noutorebiyori.com' };",
    '$lib/server/site-origin.js': `
      export const resolveIndexNowBase = () => 'https://noutorebiyori.com';
      export const resolveSiteOrigin = resolveIndexNowBase;`,
    '$lib/server/edge-cache.js': `
      export const PAGE_TAG = 'page';
      export const buildPurgeUrls = (paths) => paths;
      export const isCloudflarePlatform = () => true;
      export const purgeCloudflareUrls = async () => ({ zone: 'ok', errors: [] });
      export const quizCacheTag = (slug) => slug;`,
    '$lib/server/indexnow.js':
      'export const notifyIndexNow = async (urls) => ({ ok: true, notified: urls });',
  };
  const hook = `const stubs = ${JSON.stringify(stubs)};
    export const resolve = (specifier, context, next) =>
      Object.hasOwn(stubs, specifier)
        ? { url: 'data:text/javascript,' + encodeURIComponent(stubs[specifier]), shortCircuit: true }
        : next(specifier, context);`;
  register(`data:text/javascript,${encodeURIComponent(hook)}`);
  return import('../src/routes/api/revalidate/+server.js');
};

test('revalidate never takes the publish time from previous', async () => {
  const { POST } = await loadRevalidateRoute();
  const revalidate = async (payload) => {
    const target = new URL('https://noutorebiyori.com/api/revalidate?secret=test-secret');
    const body = JSON.stringify({ operation: 'update', ...payload });
    const request = new Request(target, { method: 'POST', body });
    const response = await POST({ request, url: target, platform: {} });
    assert.equal(response.status, 200);
    return (await response.json()).indexNow;
  };
  const past = { _type: 'quiz', slug: 'sched', publishedAt: '2020-01-01' };
  const future = { ...past, publishedAt: '2099-01-01' };
  const undated = { _type: 'quiz', slug: 'sched' };

  assert.equal((await revalidate({ previous: past, after: future })).reason, 'not-public');
  assert.equal((await revalidate({ previous: past, current: undated })).reason, 'not-public');
  assert.deepEqual((await revalidate({ previous: future, after: past })).notified, [
    url('sched'),
    url('sched/answer'),
  ]);
});
