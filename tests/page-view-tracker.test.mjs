// tests/page-view-tracker.test.mjs
//
// 本体サイトの page_view 送信ルールのテスト。
//
//   pnpm run test:page-view

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEDUPE_WINDOW_MS, createPageViewTracker } from '../src/lib/analytics/pageViewTracker.js';
import {
  MEASURED_HOSTNAMES,
  shouldMeasureHostname,
} from '../src/lib/analytics/measurementEnvironment.js';
import { CONTENT_SURFACE } from '../src/lib/analytics/surfaces.js';

const createHarness = () => {
  const sent = [];
  let clock = 0;
  const tracker = createPageViewTracker({
    send: (path) => sent.push(path),
    now: () => clock,
  });
  return {
    sent,
    tracker,
    advance: (ms) => {
      clock += ms;
    },
  };
};

test('初回表示の page_view は1回だけ送られる', () => {
  const { tracker, sent } = createHarness();
  assert.equal(tracker.track('/'), true);
  assert.deepEqual(sent, ['/']);
});

test('初回表示で onMount と afterNavigate が重なっても二重送信しない', () => {
  const { tracker, sent } = createHarness();
  // 同じパスに対する即時2回呼び出し（実装変更で起こりがちな事故）
  tracker.track('/category/kanji-quiz/kanji-001');
  assert.equal(tracker.track('/category/kanji-quiz/kanji-001'), false);
  assert.equal(sent.length, 1);
});

test('SPA 遷移ごとに1回ずつ送られる', () => {
  const { tracker, sent, advance } = createHarness();
  tracker.track('/');
  advance(50);
  tracker.track('/category/kanji-quiz');
  advance(50);
  tracker.track('/category/kanji-quiz/kanji-001');
  assert.deepEqual(sent, ['/', '/category/kanji-quiz', '/category/kanji-quiz/kanji-001']);
});

test('クエリ違いは別ページとして送る（UTM 付き流入を落とさない）', () => {
  const { tracker, sent } = createHarness();
  tracker.track('/category/kanji-quiz/kanji-001');
  tracker.track('/category/kanji-quiz/kanji-001?utm_source=gunosy');
  assert.equal(sent.length, 2);
});

test('間を空けて同じページを開き直したときは送る', () => {
  const { tracker, sent, advance } = createHarness();
  tracker.track('/');
  advance(DEDUPE_WINDOW_MS);
  assert.equal(tracker.track('/'), true);
  assert.equal(sent.length, 2);
});

test('行き来（A→B→A）はすべて送る', () => {
  const { tracker, sent } = createHarness();
  tracker.track('/a');
  tracker.track('/b');
  tracker.track('/a');
  assert.deepEqual(sent, ['/a', '/b', '/a']);
});

test('空のパスは送らない', () => {
  const { tracker, sent } = createHarness();
  assert.equal(tracker.track(''), false);
  assert.equal(tracker.track(undefined), false);
  assert.equal(sent.length, 0);
});

test('本番ホスト名でだけ計測する（プレビュー・ローカルは計測しない）', () => {
  assert.equal(shouldMeasureHostname('noutorebiyori.com'), true);
  assert.equal(shouldMeasureHostname('www.noutorebiyori.com'), true);
  assert.equal(shouldMeasureHostname('NOUTOREBIYORI.COM'), true);
  assert.equal(shouldMeasureHostname('noutore-biyori-git-preview.vercel.app'), false);
  assert.equal(shouldMeasureHostname('localhost'), false);
  assert.equal(shouldMeasureHostname('127.0.0.1'), false);
  assert.equal(shouldMeasureHostname(undefined), false);
  assert.ok(MEASURED_HOSTNAMES.includes('noutorebiyori.com'));
});

test('本体サイトの content_surface は website', () => {
  assert.equal(CONTENT_SURFACE.website, 'website');
});
