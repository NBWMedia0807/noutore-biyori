// tests/landing-log.test.mjs
//
// 着地リクエストのログ出力（$lib/server/landing-log.js）のテスト。
// サーバーを立てずに、判定とログ整形だけを検証する。
//
//   pnpm run test:landing

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  LANDING_LOG_PREFIX,
  MAX_VALUE_LENGTH,
  buildLandingLogLine,
  guessSource,
  isLandingRequest,
  truncate,
} from '../src/lib/server/landing-log.js';

const parseLine = (line) => {
  assert.ok(line.startsWith(`${LANDING_LOG_PREFIX} `), `prefix が付いていない: ${line}`);
  return JSON.parse(line.slice(LANDING_LOG_PREFIX.length + 1));
};

test('記事ページ・TOPへのドキュメント要求は着地として記録する', () => {
  for (const pathname of ['/', '/quiz/sample-quiz-a', '/category/kanji-quiz/foo', '/about']) {
    assert.equal(isLandingRequest({ pathname, secFetchDest: 'document' }), true, pathname);
  }
});

test('Sec-Fetch-Dest が無いアプリ内WebViewでも着地として記録する', () => {
  // グノシー等のアプリ内ブラウザは Sec-Fetch-* を送らないことがある
  assert.equal(isLandingRequest({ pathname: '/quiz/sample-quiz-a', secFetchDest: null }), true);
});

test('フィード・API・アセット・サイトマップ類は除外する', () => {
  const excluded = [
    '/feed/gunosy',
    '/feed/smartnews',
    '/rss/merkystyle.xml',
    '/api/revalidate',
    '/_app/immutable/chunk.js',
    '/.well-known/foo',
    '/robots.txt',
    '/sitemap.xml',
    '/favicon.ico',
    '/logo.svg',
    '/gunosy-channel-banner.png',
  ];
  for (const pathname of excluded) {
    assert.equal(isLandingRequest({ pathname }), false, pathname);
  }
});

test('ドキュメント以外のリクエスト・データ要求・サブリクエスト・非GETは除外する', () => {
  assert.equal(isLandingRequest({ pathname: '/quiz/a', secFetchDest: 'image' }), false);
  assert.equal(isLandingRequest({ pathname: '/quiz/a', secFetchDest: 'empty' }), false);
  assert.equal(isLandingRequest({ pathname: '/quiz/a', isDataRequest: true }), false);
  assert.equal(isLandingRequest({ pathname: '/quiz/a', isSubRequest: true }), false);
  assert.equal(isLandingRequest({ pathname: '/contact', method: 'POST' }), false);
});

test('User-Agent から Gunosy 系3アプリを見分ける', () => {
  assert.equal(guessSource('Mozilla/5.0 ... Gunosy/1.0', ''), 'gunosy');
  assert.equal(guessSource('Gunosy-Newspass/1.0', ''), 'newspass');
  assert.equal(guessSource('Gunosy-Servicetoday/1.0', ''), 'au_service_today');
});

test('User-Agent が素のブラウザでも Referer から流入元を推測する', () => {
  assert.equal(guessSource('Mozilla/5.0 (Android 14)', 'https://gunosy.com/articles/x'), 'gunosy');
  assert.equal(guessSource('Mozilla/5.0', 'https://ichioshi.allabout.co.jp/x'), 'allabout');
  assert.equal(guessSource('Mozilla/5.0', 'https://example.com/x'), 'referral');
});

test('Referer も手がかりも無い着地は unknown（＝GA4の(direct)/(none)候補）', () => {
  assert.equal(guessSource('Mozilla/5.0 (iPhone)', ''), 'unknown');
});

test('ログ行は1行のJSONで、必要な項目が揃っている', () => {
  const line = buildLandingLogLine({
    pathname: '/category/kanji-quiz/foo',
    search: '?utm_source=x',
    userAgent: 'Mozilla/5.0 ... Gunosy/1.0',
    referer: '',
    secFetchSite: 'none',
    secFetchMode: 'navigate',
    acceptLanguage: 'ja-JP',
  });

  assert.equal(line.includes('\n'), false, 'ログは1行であること');
  const parsed = parseLine(line);
  assert.equal(parsed.path, '/category/kanji-quiz/foo');
  assert.equal(parsed.query, '?utm_source=x');
  assert.equal(parsed.guess, 'gunosy');
  assert.equal(parsed.ref, '');
  assert.equal(parsed.sfs, 'none');
  assert.equal(parsed.sfm, 'navigate');
  assert.equal(parsed.lang, 'ja-JP');
});

test('ヘッダーが無い（null）場合でも空文字で出力できる', () => {
  const parsed = parseLine(
    buildLandingLogLine({
      pathname: '/',
      userAgent: null,
      referer: null,
      secFetchSite: null,
      secFetchMode: null,
      acceptLanguage: null,
    })
  );
  assert.equal(parsed.ua, '');
  assert.equal(parsed.ref, '');
  assert.equal(parsed.guess, 'unknown');
});

test('長いヘッダーは切り詰めてログが肥大化しないようにする', () => {
  const long = 'a'.repeat(MAX_VALUE_LENGTH + 50);
  assert.equal(truncate(long).length, MAX_VALUE_LENGTH + 1); // 末尾の … を含む
  const parsed = parseLine(buildLandingLogLine({ pathname: '/', userAgent: long }));
  assert.ok(parsed.ua.endsWith('…'));
  assert.ok(parsed.ua.length <= MAX_VALUE_LENGTH + 1);
});

test('個人を特定しうる情報（IP・クッキー）は出力しない', () => {
  const parsed = parseLine(
    buildLandingLogLine({ pathname: '/', userAgent: 'Mozilla/5.0', referer: 'https://gunosy.com/' })
  );
  assert.deepEqual(Object.keys(parsed).sort(), [
    'guess',
    'lang',
    'path',
    'query',
    'ref',
    'sfm',
    'sfs',
    'ua',
  ]);
});
