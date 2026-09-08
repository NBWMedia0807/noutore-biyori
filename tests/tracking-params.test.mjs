import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isTrackingParam,
  hasOnlyTrackingParams,
  shouldNoindexForQuery,
} from '../src/lib/utils/trackingParams.js';

// ── isTrackingParam ─────────────────────────────────────

test('utm_ で始まるパラメータはトラッキング扱い', () => {
  for (const name of [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_id',
    'utm_content',
    'utm_term',
    'utm_source_platform',
  ]) {
    assert.equal(isTrackingParam(name), true, name);
  }
});

test('Googleが将来 utm_* を増やしても追従する（接頭辞判定）', () => {
  assert.equal(isTrackingParam('utm_creative_format'), true);
  assert.equal(isTrackingParam('utm_marketing_tactic'), true);
  assert.equal(isTrackingParam('utm_something_new_2030'), true);
});

test('大文字小文字は区別しない', () => {
  assert.equal(isTrackingParam('UTM_SOURCE'), true);
  assert.equal(isTrackingParam('Utm_Campaign'), true);
});

test('トラッキング以外のパラメータは false', () => {
  for (const name of ['page', 'q', 'preview', 'foo', 'sort', 'id', 'utm', 'myutm_source']) {
    assert.equal(isTrackingParam(name), false, name);
  }
});

test('文字列以外・空文字は false', () => {
  assert.equal(isTrackingParam(''), false);
  assert.equal(isTrackingParam(undefined), false);
  assert.equal(isTrackingParam(null), false);
  assert.equal(isTrackingParam(123), false);
});

// ── hasOnlyTrackingParams ───────────────────────────────

test('クエリが無い場合は「トラッキングのみ」ではない', () => {
  assert.equal(hasOnlyTrackingParams(''), false);
  assert.equal(hasOnlyTrackingParams('?'), false);
  assert.equal(hasOnlyTrackingParams(undefined), false);
  assert.equal(hasOnlyTrackingParams(null), false);
});

test('UTM だけなら true', () => {
  assert.equal(hasOnlyTrackingParams('?utm_source=gunosy'), true);
  assert.equal(hasOnlyTrackingParams('utm_source=gunosy'), true);
  assert.equal(
    hasOnlyTrackingParams('?utm_source=gunosy&utm_medium=referral&utm_campaign=feed'),
    true
  );
});

test('UTM とそれ以外が混在したら false', () => {
  assert.equal(hasOnlyTrackingParams('?utm_source=gunosy&foo=bar'), false);
  assert.equal(hasOnlyTrackingParams('?foo=bar&utm_source=gunosy'), false);
});

test('値が空のUTMもトラッキング扱い', () => {
  assert.equal(hasOnlyTrackingParams('?utm_source='), true);
  assert.equal(hasOnlyTrackingParams('?utm_source'), true);
});

// ── shouldNoindexForQuery（レイアウトが使う本体）────────

test('1. クエリ無し → index', () => {
  assert.equal(shouldNoindexForQuery(''), false);
  assert.equal(shouldNoindexForQuery(undefined), false);
  assert.equal(shouldNoindexForQuery(null), false);
  assert.equal(shouldNoindexForQuery('?'), false);
});

test('2. utm_source のみ → index', () => {
  assert.equal(shouldNoindexForQuery('?utm_source=gunosy'), false);
});

test('3. utm_source + utm_medium + utm_campaign → index', () => {
  assert.equal(
    shouldNoindexForQuery('?utm_source=gunosy&utm_medium=referral&utm_campaign=feed'),
    false
  );
});

test('4. 未知のクエリ foo=bar → noindex', () => {
  assert.equal(shouldNoindexForQuery('?foo=bar'), true);
});

test('5. UTM + foo=bar → noindex', () => {
  assert.equal(shouldNoindexForQuery('?utm_source=gunosy&foo=bar'), true);
});

test('検索・ページング・プレビューは従来どおり noindex', () => {
  assert.equal(shouldNoindexForQuery('?page=2'), true);
  assert.equal(shouldNoindexForQuery('?q=漢字'), true);
  assert.equal(shouldNoindexForQuery('?preview=1'), true);
  assert.equal(shouldNoindexForQuery('?page=2&utm_source=gunosy'), true);
});

test('「クエリがあれば何でも index」になっていないこと', () => {
  // utm に似ているが別物のパラメータは通さない
  assert.equal(shouldNoindexForQuery('?utm=gunosy'), true);
  assert.equal(shouldNoindexForQuery('?myutm_source=gunosy'), true);
  assert.equal(shouldNoindexForQuery('?source=gunosy'), true);
  // クリックIDは現時点では対象外（意図的に noindex のまま）
  assert.equal(shouldNoindexForQuery('?gclid=abc'), true);
  assert.equal(shouldNoindexForQuery('?fbclid=abc'), true);
});

// ── レビュー指摘: 計測パラメータ以外が1つでも混ざれば noindex ────

test('utm + preview の組み合わせは index 許可しない', () => {
  assert.equal(shouldNoindexForQuery('?utm_source=x&preview=true'), true);
  assert.equal(shouldNoindexForQuery('?utm_source=x&utm_medium=y&preview=true'), true);
  assert.equal(shouldNoindexForQuery('?preview=true&utm_source=x'), true);
});
