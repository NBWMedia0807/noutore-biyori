// tests/pinterest-feed.test.mjs
//
// Pinterest 用 RSS（/feed/pinterest.xml）のテスト。
// Sanity にもネットワークにも触れず、サンプル記事から組み立てた XML を検証する。
//
//   pnpm run test:pinterest

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildPinterestFeed, MAX_ITEMS } from '../src/lib/rss/pinterestFeed.js';

const pinterestImage = (n) => ({
  asset: {
    url: `https://cdn.sanity.io/images/quljge22/production/pin${n}-1000x1500.jpg`,
    size: 123456 + n,
    mimeType: 'image/jpeg',
  },
});

const block = (text) => [{ _type: 'block', children: [{ _type: 'span', text }] }];

const matchstick = (n, overrides = {}) => ({
  _id: `quiz-${n}`,
  publishedAt: `2026-10-${String(20 + (n % 9)).padStart(2, '0')}T00:00:00Z`,
  title: `【マッチ棒クイズ】1本だけ動かして正しい式に：${n}+1=8？`,
  slug: `matchstick-quiz/q-${n}`,
  problemDescription: block(`式「${n}+1=8」を正しい等式に直してください。`),
  pinterestImage: pinterestImage(n),
  ...overrides,
});

const itemBlocks = (xml) => [...xml.matchAll(/<item>[\s\S]*?<\/item>/g)].map((m) => m[0]);

test('RSS 2.0 の channel 必須要素がそろっている', () => {
  const xml = buildPinterestFeed([matchstick(1)], { now: new Date('2026-10-29T00:00:00Z') });
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<rss version="2.0"/);
  assert.match(xml, /<channel>\n  <title>[^<]+<\/title>/);
  assert.match(xml, /<link>https:\/\/noutorebiyori\.com\/<\/link>/);
  assert.match(xml, /<description>[^<]+<\/description>/);
  assert.match(xml, /<atom:link href="https:\/\/noutorebiyori\.com\/feed\/pinterest\.xml" rel="self"/);
});

test('item は問題ページへのリンクと縦長画像の enclosure を持つ', () => {
  const [item] = itemBlocks(buildPinterestFeed([matchstick(3)]));
  assert.match(item, /<link>https:\/\/noutorebiyori\.com\/quiz\/matchstick-quiz\/q-3<\/link>/);
  assert.match(item, /<guid isPermaLink="true">https:\/\/noutorebiyori\.com\/quiz\/matchstick-quiz\/q-3<\/guid>/);
  assert.match(
    item,
    /<enclosure url="https:\/\/cdn\.sanity\.io\/images\/quljge22\/production\/pin3-1000x1500\.jpg" length="123459" type="image\/jpeg" \/>/
  );
  assert.match(item, /<pubDate>[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} \+0900<\/pubDate>/);
  assert.match(item, /<description>式「3\+1=8」を正しい等式に直してください。<\/description>/);
  // 解答ページや UTM は付けない
  assert.doesNotMatch(item, /\/answer|utm_/);
});

test('pinterestImage が無い問題・マッチ棒以外・不完全な画像は載せない', () => {
  const xml = buildPinterestFeed([
    matchstick(1),
    matchstick(2, { pinterestImage: null }),
    matchstick(3, { slug: 'kanji-quiz/q-3' }),
    matchstick(4, { pinterestImage: { asset: { url: 'https://cdn.sanity.io/x.jpg' } } }),
    matchstick(5, { pinterestImage: { asset: { url: 'http://insecure/x.jpg', size: 10 } } }),
  ]);
  const items = itemBlocks(xml);
  assert.equal(items.length, 1);
  assert.match(items[0], /q-1<\/link>/);
});

test('解答に関わるフィールドは出力しない', () => {
  const xml = buildPinterestFeed([
    matchstick(1, {
      answerExplanation: block('正解は 8+1=9 でした'),
      answerImage: { asset: { url: 'https://cdn.sanity.io/answer.jpg' } },
    }),
  ]);
  assert.doesNotMatch(xml, /正解は|answer\.jpg/);
});

test('XML の特殊文字はエスケープされる', () => {
  const xml = buildPinterestFeed([matchstick(1, { title: '<A&B> "式"' })]);
  assert.match(xml, /<title>&lt;A&amp;B&gt; &quot;式&quot;<\/title>/);
});

test(`item は最大 ${MAX_ITEMS} 件`, () => {
  const docs = Array.from({ length: MAX_ITEMS + 10 }, (_, i) => matchstick(i));
  assert.equal(itemBlocks(buildPinterestFeed(docs)).length, MAX_ITEMS);
});

test('問題が0件でも妥当な空フィードを返す', () => {
  const xml = buildPinterestFeed([]);
  assert.equal(itemBlocks(xml).length, 0);
  assert.match(xml, /<\/channel>\n<\/rss>$/);
});
