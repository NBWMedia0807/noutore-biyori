// tests/traffic-source.test.mjs
//
// 流入元判定（$lib/analytics/traffic-source.js）のテスト。
//
//   pnpm run test:traffic

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  IN_APP_CONTENT_GROUP,
  MAX_PARAM_LENGTH,
  SITE_CONTENT_GROUP,
  UNKNOWN_PARTNER,
  buildTrafficParams,
  buildUaFingerprint,
  detectPartner,
} from '../src/lib/analytics/traffic-source.js';

const IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

test('User-Agent から Gunosy 系3アプリを見分ける', () => {
  assert.equal(detectPartner({ userAgent: `${IOS} Gunosy/1.0` }), 'gunosy');
  assert.equal(detectPartner({ userAgent: `${IOS} Gunosy-Newspass/1.0` }), 'newspass');
  assert.equal(detectPartner({ userAgent: `${IOS} Gunosy-Servicetoday/1.0` }), 'au_service_today');
});

test('Referer のホスト名からも判定する', () => {
  const cases = [
    ['https://gunosy.com/articles/xxxx', 'gunosy'],
    ['https://content.newspass.jp/x', 'newspass'],
    ['https://content.service-top.jp/x', 'au_service_today'],
    ['https://ichioshi.allabout.co.jp/x', 'allabout'],
    ['https://trilltrill.jp/articles/1', 'trill'],
  ];
  for (const [referrer, expected] of cases) {
    assert.equal(detectPartner({ userAgent: IOS, referrer }), expected, referrer);
  }
});

test('判定できないものは null を返す（検索流入などを取り違えない）', () => {
  assert.equal(detectPartner({ userAgent: IOS }), null);
  assert.equal(detectPartner({ userAgent: IOS, referrer: 'https://www.google.com/' }), null);
  assert.equal(detectPartner({ userAgent: IOS, referrer: 'https://noutorebiyori.com/' }), null);
  assert.equal(detectPartner({ userAgent: IOS, referrer: 'not-a-url' }), null);
  assert.equal(detectPartner({}), null);
});

test('似て非なるドメインを誤判定しない', () => {
  for (const referrer of ['https://gunosy.com.evil.example/', 'https://notgunosy.com/']) {
    assert.equal(detectPartner({ userAgent: IOS, referrer }), null, referrer);
  }
});

test('サイトのPVには content_group=site が付く', () => {
  const { params } = buildTrafficParams({ userAgent: `${IOS} Gunosy/1.0` });
  assert.equal(params.content_group, SITE_CONTENT_GROUP);
  assert.equal(params.traffic_partner, 'gunosy');
  // アプリ内表示と同じ値になってはいけない（分離できなくなる）
  assert.notEqual(SITE_CONTENT_GROUP, IN_APP_CONTENT_GROUP);
});

test('セッション中に判定済みならその値を使い回す（2ページ目以降）', () => {
  // 2ページ目は referrer が自サイトになり判定できないが、保存値を引き継ぐ
  const { partner, params } = buildTrafficParams({
    userAgent: IOS,
    referrer: 'https://noutorebiyori.com/quiz/x',
    storedPartner: 'gunosy',
  });
  assert.equal(partner, 'gunosy');
  assert.equal(params.traffic_partner, 'gunosy');
});

test('判定できないときは unknown ＋ UA の手がかりを添える', () => {
  const { partner, params } = buildTrafficParams({ userAgent: `${IOS} MysteryApp/9.9` });
  assert.equal(partner, UNKNOWN_PARTNER);
  assert.equal(params.traffic_partner, UNKNOWN_PARTNER);
  assert.ok(params.traffic_partner_ua.includes('MysteryApp/9.9'), params.traffic_partner_ua);
});

test('判定できたときは UA の手がかりを送らない', () => {
  const { params } = buildTrafficParams({ userAgent: `${IOS} Gunosy/1.0` });
  assert.equal('traffic_partner_ua' in params, false);
});

test('UA の手がかりは、どのブラウザにも共通する部分を落としたもの', () => {
  const fp = buildUaFingerprint(`${IOS} SomeApp/2.1`);
  assert.ok(fp.includes('SomeApp/2.1'));
  for (const noise of ['Mozilla', 'AppleWebKit', 'KHTML', 'Safari/', 'iPhone', 'Mobile/']) {
    assert.ok(!fp.includes(noise), `${noise} が残っている: ${fp}`);
  }
});

test('手がかりに端末の型番を含めない（アプリ識別子だけを拾う）', () => {
  const androidChrome =
    'Mozilla/5.0 (Linux; Android 14; SC-52B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36';
  assert.equal(buildUaFingerprint(androidChrome), '');

  const inApp = `${androidChrome} SomeReader/3.2`;
  assert.equal(buildUaFingerprint(inApp), 'SomeReader/3.2');
});

test('括弧で囲まれたアプリ識別子も拾える', () => {
  const fb = `${IOS} [FBAN/FBIOS;FBAV/470.0]`;
  assert.equal(buildUaFingerprint(fb), 'FBAN/FBIOS FBAV/470.0');
});

test('素のブラウザは手がかりが空になり、パラメータも増えない', () => {
  assert.equal(buildUaFingerprint(IOS), '');
  const { params } = buildTrafficParams({ userAgent: IOS });
  assert.equal('traffic_partner_ua' in params, false);
});

test('GA4 のイベントパラメータ上限（100文字）を超えない', () => {
  const long = `${IOS} ${'X'.repeat(300)}`;
  assert.ok(buildUaFingerprint(long).length <= MAX_PARAM_LENGTH);
  const { params } = buildTrafficParams({ userAgent: long });
  for (const [k, v] of Object.entries(params)) {
    assert.ok(v.length <= MAX_PARAM_LENGTH, `${k} が長すぎる: ${v.length}`);
  }
});

test('セッションの参照元/メディアを書き換えるパラメータは送らない（フェーズA）', () => {
  const { params } = buildTrafficParams({ userAgent: `${IOS} Gunosy/1.0` });
  for (const key of Object.keys(params)) {
    assert.ok(!key.startsWith('campaign'), `campaign 系パラメータが混ざっている: ${key}`);
  }
});

test('入力が壊れていても例外を投げない', () => {
  for (const input of [{}, { userAgent: null }, { referrer: null }, { userAgent: 123 }]) {
    assert.doesNotThrow(() => buildTrafficParams(input), JSON.stringify(input));
  }
});
