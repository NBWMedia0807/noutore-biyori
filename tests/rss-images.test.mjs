// tests/rss-images.test.mjs
//
// RSS 用の画像 URL 組み立て（src/lib/rss/images.ts の buildImageUrl / resolveImage）。
// 本番ログで最多だった `[rss/images] Failed to build image URL` の再発防止。
// 当時の原因: Merkystyle フィードが解決済みの画像 { url, width, height, mimeType, alt } を
// もう一度 resolveImage に通し、@sanity/image-url が「Unable to resolve image URL from source」を投げていた
// （1リクエストで全100記事ぶん）。
//
//   node --import ./tests/helpers/register-kit-alias.mjs --test tests/rss-images.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SanityClient } from '@sanity/client';

import { buildImageUrl, resolveImage } from '../src/lib/rss/images.ts';
import { GET as merkystyleGET } from '../src/routes/rss/merkystyle.xml/+server.ts';

const CDN = 'https://cdn.sanity.io/images/quljge22/production';
const REF = 'image-abc123-800x450-png';

const noErrorLog = (t) => {
  const spy = t.mock.method(console, 'error', () => {});
  return () => assert.equal(spy.mock.callCount(), 0, 'console.error が呼ばれた');
};

test('解決済みの画像（Merkystyle の enclosure の形）は例外もログも無く URL を返す', (t) => {
  const assertNoLog = noErrorLog(t);
  const resolved = {
    url: `${CDN}/fd69e712464452ef0e0f45de55b0695af3e1086d-1280x720.png?w=640&auto=format`,
    width: 1280,
    height: 720,
    mimeType: 'image/png',
    alt: null,
  };
  assert.equal(
    buildImageUrl(resolved, { width: 640 }),
    `${CDN}/fd69e712464452ef0e0f45de55b0695af3e1086d-1280x720.png?w=640&auto=format`
  );
  assert.equal(resolveImage([resolved], { minWidth: 640 })?.url, resolved.url);
  assertNoLog();
});

test('_ref の参照（生の画像フィールド・本文の image ブロック）は builder で組む', (t) => {
  const assertNoLog = noErrorLog(t);
  assert.equal(
    buildImageUrl({ _type: 'image', asset: { _type: 'reference', _ref: REF } }, { width: 1200 }),
    `${CDN}/abc123-800x450.png?w=1200&auto=format`
  );
  assertNoLog();
});

test('asset-> で展開済み（_id と url）も従来どおり builder で組む', (t) => {
  const assertNoLog = noErrorLog(t);
  const source = {
    alt: '問題画像',
    asset: {
      _id: REF,
      url: `${CDN}/abc123-800x450.png`,
      extension: 'png',
      metadata: { dimensions: { width: 800, height: 450 } },
    },
  };
  assert.equal(
    buildImageUrl(source, { width: 1200, format: 'jpg' }),
    `${CDN}/abc123-800x450.png?w=1200&fm=jpg`
  );
  assert.equal(
    buildImageUrl(source, { width: 320, height: 240, format: 'jpg' }),
    `${CDN}/abc123-800x450.png?rect=100,0,600,450&w=320&h=240&fm=jpg&fit=crop`
  );
  const resolved = resolveImage([source], { minWidth: 640 });
  assert.deepEqual(resolved, {
    url: `${CDN}/abc123-800x450.png?w=640&auto=format`,
    width: 800,
    height: 450,
    mimeType: 'image/png',
    alt: '問題画像',
  });
  assertNoLog();
});

test('crop / hotspot は builder にそのまま渡る', (t) => {
  const assertNoLog = noErrorLog(t);
  const url = buildImageUrl(
    {
      asset: { _ref: REF },
      crop: { top: 0.1, bottom: 0.1, left: 0, right: 0 },
      hotspot: { x: 0.5, y: 0.5, width: 1, height: 1 },
    },
    { width: 600 }
  );
  assert.equal(url, `${CDN}/abc123-800x450.png?rect=0,45,800,360&w=600&auto=format`);
  assertNoLog();
});

test('アセット ID の文字列・参照そのもの・アセット文書も組める', (t) => {
  const assertNoLog = noErrorLog(t);
  const expected = `${CDN}/abc123-800x450.png?w=100&auto=format`;
  assert.equal(buildImageUrl(REF, { width: 100 }), expected);
  assert.equal(buildImageUrl({ _type: 'reference', _ref: REF }, { width: 100 }), expected);
  assert.equal(
    buildImageUrl({ _id: REF, url: `${CDN}/abc123-800x450.png` }, { width: 100 }),
    expected
  );
  assertNoLog();
});

test('url だけの場合: cdn.sanity.io は幅・形式を付け直し、トリミング（rect）は残す', (t) => {
  const assertNoLog = noErrorLog(t);
  assert.equal(
    buildImageUrl({ asset: { url: `${CDN}/abc123-800x450.png` } }, { width: 1200 }),
    `${CDN}/abc123-800x450.png?w=1200&auto=format`
  );
  assert.equal(
    buildImageUrl(
      { url: `${CDN}/abc123-800x450.png?rect=1,2,300,200&w=300&h=200&fit=max&auto=format` },
      { width: 320, height: 240, format: 'jpg' }
    ),
    `${CDN}/abc123-800x450.png?rect=1%2C2%2C300%2C200&w=320&h=240&fit=crop&fm=jpg`
  );
  assert.equal(
    buildImageUrl(`//cdn.sanity.io/images/quljge22/production/abc123-800x450.png`, { width: 10 }),
    `${CDN}/abc123-800x450.png?w=10&auto=format`
  );
  assertNoLog();
});

test('Sanity 以外の URL は変換せずそのまま返す', (t) => {
  const assertNoLog = noErrorLog(t);
  assert.equal(
    buildImageUrl({ url: 'https://example.com/a.png?w=300' }, { width: 1200 }),
    'https://example.com/a.png?w=300'
  );
  assert.equal(
    buildImageUrl('https://example.com/b.jpg', { width: 1200 }),
    'https://example.com/b.jpg'
  );
  assertNoLog();
});

test('画像が無い・壊れている入力は null（ログも出さない）', (t) => {
  const assertNoLog = noErrorLog(t);
  const cases = [
    null,
    undefined,
    '',
    '   ',
    0,
    {},
    // アップロード途中で止まった画像フィールド（asset なし）
    { _type: 'image', _upload: { progress: 2 } },
    // asset-> の参照先が無いときの投影結果
    { alt: null, asset: null },
    { alt: '説明だけ', asset: {} },
    // 形が壊れた参照・画像でないファイル参照
    { asset: { _ref: 'image-broken' } },
    { asset: { _ref: 'file-abc123-pdf' } },
    'not-a-url',
    'javascript:alert(1)',
  ];
  for (const source of cases) {
    assert.equal(buildImageUrl(source, { width: 1200 }), null, JSON.stringify(source));
  }
  assert.equal(resolveImage([null, { alt: null, asset: null }], { minWidth: 640 }), null);
  assertNoLog();
});

test('壊れた参照でも asset.url があれば URL を返す', (t) => {
  const assertNoLog = noErrorLog(t);
  assert.equal(
    buildImageUrl(
      { asset: { _ref: 'image-broken', url: `${CDN}/abc123-800x450.png` } },
      { width: 1200 }
    ),
    `${CDN}/abc123-800x450.png?w=1200&auto=format`
  );
  assertNoLog();
});

test('Merkystyle フィードの組み立てで [rss/images] のエラーログが出ない（enclosure を二重解決しない）', async (t) => {
  const spy = t.mock.method(console, 'error', () => {});
  const image = (name) => ({
    alt: null,
    asset: {
      _id: `image-${name}-1280x720-png`,
      url: `${CDN}/${name}-1280x720.png`,
      extension: 'png',
      metadata: { dimensions: { width: 1280, height: 720 } },
    },
  });
  t.mock.method(SanityClient.prototype, 'fetch', async () => [
    {
      slug: 'image-log-test',
      title: 'ログ検証',
      publishedAt: new Date().toISOString(),
      problemImage: image('problem'),
      answerImage: image('answer'),
      problemDescription: '問題文。',
    },
  ]);

  const response = await merkystyleGET({ setHeaders() {} });
  assert.equal(response.status, 200);
  const xml = await response.text();
  const rssImageErrors = spy.mock.calls.filter((call) =>
    String(call.arguments[0]).includes('[rss/images]')
  );
  assert.equal(rssImageErrors.length, 0);
  assert.match(
    xml,
    new RegExp(`<enclosure url="${CDN}/problem-1280x720.png\\?w=640&amp;auto=format"`)
  );
});
