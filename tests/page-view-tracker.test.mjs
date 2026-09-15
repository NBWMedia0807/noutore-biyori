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
import { APP_WEBVIEW, detectAppWebview } from '../src/lib/analytics/appWebview.js';

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

// ── 本体サイト PV の内訳（どのアプリ内ブラウザで開かれたか）────────

test('SmartNews のアプリ内ブラウザを判定できる', () => {
  const ua =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 ' +
    '(KHTML, like Gecko) Mobile/15E148 SmartNews/25.3.0';
  assert.equal(detectAppWebview(ua), APP_WEBVIEW.smartnews);
});

test('グノシー系3アプリを区別できる（個別アプリを優先する）', () => {
  assert.equal(detectAppWebview('Mozilla/5.0 ... Gunosy-Servicetoday/1.0'), 'au_service_today');
  assert.equal(detectAppWebview('Mozilla/5.0 ... Gunosy-Newspass/1.0'), 'newspass');
  assert.equal(detectAppWebview('Mozilla/5.0 ... Gunosy/1.0'), 'gunosy');
});

test('判定は大文字小文字を問わない', () => {
  assert.equal(detectAppWebview('... SMARTNEWS/25.3.0'), APP_WEBVIEW.smartnews);
  assert.equal(detectAppWebview('... GUNOSY/1.0'), APP_WEBVIEW.gunosy);
});

test('通常のブラウザは browser になる', () => {
  const chrome =
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/127.0.0.0 Mobile Safari/537.36';
  const safari =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 ' +
    '(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
  assert.equal(detectAppWebview(chrome), APP_WEBVIEW.browser);
  assert.equal(detectAppWebview(safari), APP_WEBVIEW.browser);
});

test('UA が取れなくても値は必ず入る（(not set) を作らない）', () => {
  assert.equal(detectAppWebview(''), APP_WEBVIEW.browser);
  assert.equal(detectAppWebview(undefined), APP_WEBVIEW.browser);
  assert.equal(detectAppWebview(null), APP_WEBVIEW.browser);
});
