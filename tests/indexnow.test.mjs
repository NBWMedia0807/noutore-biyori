import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
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

const schedulerAt = (clock) =>
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
