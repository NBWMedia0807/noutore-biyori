import test from 'node:test';
import assert from 'node:assert/strict';

import {
  withFeedUtm,
  FEED_UTM_SOURCE,
  SMARTNEWS_RECIRCULATION_UTM,
  SMARTNEWS_RECIRCULATION_CONTENT,
} from '../src/lib/utils/feedUtm.js';

const ARTICLE = 'https://noutorebiyori.com/category/kanji-quiz/sample';

test('utm_source / utm_medium / utm_campaign を付ける', () => {
  const url = new URL(withFeedUtm(ARTICLE, { source: 'gunosy' }));
  assert.equal(url.origin + url.pathname, ARTICLE);
  assert.equal(url.searchParams.get('utm_source'), 'gunosy');
  assert.equal(url.searchParams.get('utm_medium'), 'referral');
  assert.equal(url.searchParams.get('utm_campaign'), 'feed');
});

test('medium / campaign は上書きできる', () => {
  const url = new URL(withFeedUtm(ARTICLE, { source: 'trill', medium: 'app', campaign: 'daily' }));
  assert.equal(url.searchParams.get('utm_medium'), 'app');
  assert.equal(url.searchParams.get('utm_campaign'), 'daily');
});

test('既存のクエリは保持される', () => {
  const url = new URL(withFeedUtm(`${ARTICLE}?page=2`, { source: 'gunosy' }));
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(url.searchParams.get('utm_source'), 'gunosy');
});

test('既に utm_source があれば二重付与しない', () => {
  const already = `${ARTICLE}?utm_source=smartnews`;
  assert.equal(withFeedUtm(already, { source: 'gunosy' }), already);
});

test('壊れた入力でフィードを壊さない', () => {
  assert.equal(withFeedUtm('', { source: 'gunosy' }), '');
  assert.equal(withFeedUtm(null, { source: 'gunosy' }), '');
  assert.equal(withFeedUtm(undefined, { source: 'gunosy' }), '');
  // 相対URLは加工せずそのまま返す
  assert.equal(withFeedUtm('/category/x/y', { source: 'gunosy' }), '/category/x/y');
  // source が無ければ何もしない
  assert.equal(withFeedUtm(ARTICLE, {}), ARTICLE);
  assert.equal(withFeedUtm(ARTICLE), ARTICLE);
});

test('配信フィードごとの utm_source が定義されている', () => {
  assert.equal(FEED_UTM_SOURCE.gunosy, 'gunosy');
  assert.equal(FEED_UTM_SOURCE.trill, 'trill');
  assert.equal(FEED_UTM_SOURCE.merkystyle, 'merkystyle');
  // SmartNews は SmartFormat 仕様により <link> へ UTM を付けないので定義しない
  assert.equal(FEED_UTM_SOURCE.smartnews, undefined);
});

// ── レビュー指摘の境界・エスケープをテストに固定する ────

test('Gunosy: UTM付与後の長さで256文字を判定する（255=配信 / 256=除外）', async () => {
  const m = await import('../src/lib/rss/gunosyFeed.js');
  const deps = {
    buildImageUrl: () => 'https://cdn.sanity.io/i.jpg',
    resolvePublishedDate: () => '2026-09-01T00:00:00.000Z',
    gaMeasurementId: 'G-855Y7S6M95',
  };
  const utmLen = '?utm_source=gunosy&utm_medium=referral&utm_campaign=feed'.length;
  const baseLen = 'https://noutorebiyori.com/category/kanji-quiz/'.length;
  const mk = (slug) => ({
    _id: 'id',
    slug,
    title: 'タイトル',
    category: { slug: 'kanji-quiz', title: 'C' },
    publishedAt: '2026-09-01T00:00:00.000Z',
    problemImage: { asset: { url: 'https://cdn.sanity.io/x.jpg' } },
  });

  const justUnder = 'a'.repeat(m.MAX_URL_LENGTH - 1 - baseLen - utmLen);
  assert.notEqual(m.toGunosyItem(mk(justUnder), deps), null, '255文字は配信される');

  const atLimit = 'a'.repeat(m.MAX_URL_LENGTH - baseLen - utmLen);
  assert.equal(m.toGunosyItem(mk(atLimit), deps), null, '256文字は除外される');
});

test('Gunosy: XML出力で & が &amp; にエスケープされる', async () => {
  const m = await import('../src/lib/rss/gunosyFeed.js');
  const feed = m.buildGunosyFeed(
    [
      {
        _id: 'id',
        slug: 'sample',
        title: 'タイトル',
        category: { slug: 'kanji-quiz', title: 'C' },
        publishedAt: '2026-09-01T00:00:00.000Z',
        problemImage: { asset: { url: 'https://cdn.sanity.io/x.jpg' } },
      },
    ],
    {
      buildImageUrl: () => 'https://cdn.sanity.io/i.jpg',
      resolvePublishedDate: () => '2026-09-01T00:00:00.000Z',
      gaMeasurementId: 'G-855Y7S6M95',
    }
  );
  const linkLine = feed.split('\n').find((l) => l.includes('<link>') && l.includes('utm_'));
  assert.ok(linkLine, 'UTM付きの <link> 行が存在する');
  assert.ok(linkLine.includes('&amp;utm_medium='), '& が &amp; になっている');
  assert.ok(!/[^;]&(?!amp;)/.test(linkLine), '未エスケープの & が残っていない');
});

// ── SmartNews の回遊枠（記事下からサイトへ出ていくリンク）────

test('utm_content は指定したときだけ付く', () => {
  const without = new URL(withFeedUtm(ARTICLE, { source: 'gunosy' }));
  assert.equal(without.searchParams.get('utm_content'), null);

  const withContent = new URL(withFeedUtm(ARTICLE, { source: 'gunosy', content: 'bodylink' }));
  assert.equal(withContent.searchParams.get('utm_content'), 'bodylink');

  // 空文字は付けない（意味のない utm_content= を生まないため）
  const empty = new URL(withFeedUtm(ARTICLE, { source: 'gunosy', content: '' }));
  assert.equal(empty.searchParams.get('utm_content'), null);
});

test('SmartNews 回遊枠は smartnews / recirculation で枠ごとに utm_content が分かれる', () => {
  // SmartView 内の表示は snf:analytics 経由で `smartnews.com / referral` になるため、
  // 実際にサイトへ着地した人を medium で見分けられるようにしている。
  assert.equal(SMARTNEWS_RECIRCULATION_UTM.source, 'smartnews');
  assert.equal(SMARTNEWS_RECIRCULATION_UTM.medium, 'recirculation');

  const contents = Object.values(SMARTNEWS_RECIRCULATION_CONTENT);
  assert.deepEqual(contents, ['sponsoredlink', 'bodylink', 'relatedlink']);
  assert.equal(new Set(contents).size, contents.length, '枠ごとに別の値になっている');

  const url = new URL(
    withFeedUtm(ARTICLE, {
      ...SMARTNEWS_RECIRCULATION_UTM,
      content: SMARTNEWS_RECIRCULATION_CONTENT.sponsoredLink,
    })
  );
  assert.equal(url.searchParams.get('utm_source'), 'smartnews');
  assert.equal(url.searchParams.get('utm_medium'), 'recirculation');
  assert.equal(url.searchParams.get('utm_content'), 'sponsoredlink');
});

test('既存の utm_medium は重複せず上書きされる', () => {
  const url = new URL(withFeedUtm(`${ARTICLE}?utm_medium=old`, { source: 'gunosy' }));
  assert.equal(url.searchParams.getAll('utm_medium').length, 1);
  assert.equal(url.searchParams.get('utm_medium'), 'referral');
});
