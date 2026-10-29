import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPinterestFeed, toPinterestItem } from '../src/lib/rss/pinterestFeed.js';
import { withFeedUtm, FEED_UTM_SOURCE } from '../src/lib/utils/feedUtm.js';

const DOC = {
  _id: 'matchstick-quiz-1234',
  publishedAt: '2026-10-28T15:00:00Z',
  title: '【マッチ棒クイズ】1本だけ動かして正しい式に：6+4=4？',
  slug: 'matchstick-quiz/article/1234',
  problemDescription: [
    { _type: 'block', children: [{ _type: 'span', text: 'マッチ棒を1本動かして' }] },
    { _type: 'block', children: [{ _type: 'span', text: '正しい式にしてください。' }] },
  ],
  pinterestImage: {
    url: 'https://cdn.sanity.io/images/p/production/abc-1000x1500.png',
    size: 123456,
    mimeType: 'image/png',
  },
};

const decorateLink = (url) => withFeedUtm(url, { source: FEED_UTM_SOURCE.pinterest });

test('item は問題ページへのリンクと縦長画像の enclosure を持つ', () => {
  const xml = buildPinterestFeed([DOC], { decorateLink, now: new Date('2026-10-29T00:00:00Z') });
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<rss version="2.0"/);
  assert.match(
    xml,
    /<guid isPermaLink="true">https:\/\/noutorebiyori\.com\/quiz\/matchstick-quiz\/article\/1234<\/guid>/
  );
  assert.match(
    xml,
    /<link>https:\/\/noutorebiyori\.com\/quiz\/matchstick-quiz\/article\/1234\?utm_source=pinterest&amp;utm_medium=referral&amp;utm_campaign=feed<\/link>/
  );
  assert.match(
    xml,
    /<enclosure url="https:\/\/cdn\.sanity\.io\/images\/p\/production\/abc-1000x1500\.png" length="123456" type="image\/png" \/>/
  );
  assert.match(xml, /<pubDate>Wed, 28 Oct 2026 15:00:00 GMT<\/pubDate>/);
  assert.match(
    xml,
    /<description>マッチ棒を1本動かして 正しい式にしてください。 答えは脳トレ日和のサイトで。<\/description>/
  );
});

test('縦長画像の無い記事は出さない', () => {
  assert.equal(toPinterestItem({ ...DOC, pinterestImage: null }), null);
  const xml = buildPinterestFeed([{ ...DOC, pinterestImage: null }]);
  assert.doesNotMatch(xml, /<item>/);
});

test('タイトルなどの特殊文字はエスケープする', () => {
  const xml = buildPinterestFeed([{ ...DOC, title: 'A & B <C>' }]);
  assert.match(xml, /<title>A &amp; B &lt;C&gt;<\/title>/);
});

test('サイズ不明でも length 属性は必ず出す', () => {
  const item = toPinterestItem({ ...DOC, pinterestImage: { url: DOC.pinterestImage.url } });
  assert.deepEqual(item.enclosure, { url: DOC.pinterestImage.url, length: 0, type: 'image/png' });
});
