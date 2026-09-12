// tests/smartnews-feed.test.mjs
//
// SmartNews / ママテナ / イチオシ 共通フィード（/feed/smartnews）の配信テスト。
// `src/routes/feed/smartnews/+server.js` を本番と同じコードのまま実行し、
// 出来上がった XML を検証する（Sanity だけ tests/helpers/stubs/ で差し替え）。
//
//   pnpm run test:smartnews
//
// ここでの主眼は「GA4 計測の修正で配信仕様に手が入っていないこと」の固定。
// link / guid / 本文 / 画像 / 件数 / 並び順が変わったらテストで落ちる。

import test from 'node:test';
import assert from 'node:assert/strict';

import { GET } from '../src/routes/feed/smartnews/+server.js';
import {
  createSmartnewsFixtureArticles,
  createSmartnewsFixtureLatestQuizzes,
} from '../scripts/fixtures/smartnews-feed-docs.mjs';

const GA_ID = 'G-855Y7S6M95';
const SITE = 'https://noutorebiyori.com/';

const fetchFeed = async () => {
  const response = await GET({
    request: new Request('https://noutorebiyori.com/feed/smartnews'),
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'application/xml');
  return response.text();
};

const itemBlocks = (xml) => [...xml.matchAll(/<item>[\s\S]*?<\/item>/g)].map((m) => m[0]);
const tagValues = (xml, tag) =>
  [...xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => m[1]);
const analyticsSnippets = (xml) =>
  [...xml.matchAll(/<snf:analytics><!\[CDATA\[([\s\S]*?)\]\]><\/snf:analytics>/g)].map((m) => m[1]);

const feed = await fetchFeed();
const articles = createSmartnewsFixtureArticles();

// ── XML としての健全性 ─────────────────────────────────────

test('XML 宣言と4名前空間が揃っている', () => {
  assert.ok(feed.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  for (const ns of [
    'xmlns:content="http://purl.org/rss/1.0/modules/content/"',
    'xmlns:dc="http://purl.org/dc/elements/1.1/"',
    'xmlns:media="http://search.yahoo.com/mrss/"',
    'xmlns:snf="http://www.smartnews.be/snf"',
  ]) {
    assert.ok(feed.includes(ns), `名前空間が無い: ${ns}`);
  }
  assert.ok(feed.trimEnd().endsWith('</rss>'));
});

test('タグの開閉が対応している（item / channel / rss）', () => {
  for (const tag of ['rss', 'channel', 'item', 'snf:advertisement']) {
    const open = (feed.match(new RegExp(`<${tag}(?:\\s[^>]*)?>`, 'g')) ?? []).length;
    const close = (feed.match(new RegExp(`</${tag}>`, 'g')) ?? []).length;
    assert.equal(open, close, `${tag} の開閉数が合わない`);
  }
});

test('CDATA が途中で閉じていない', () => {
  const cdataBlocks = [...feed.matchAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g)].map((m) => m[1]);
  assert.ok(cdataBlocks.length > 0);
  for (const body of cdataBlocks) {
    assert.ok(!body.includes(']]>'), 'CDATA の中に ]]> が残っている');
  }
  // 開始と終了の数が一致する（= どこかで壊れていない）
  assert.equal((feed.match(/<!\[CDATA\[/g) ?? []).length, (feed.match(/\]\]>/g) ?? []).length);
});

test('CDATA の外に未エスケープの & < > が無い', () => {
  const withoutCdata = feed.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
  const text = withoutCdata.replace(/<[^>]*>/g, '');
  assert.ok(!/&(?!(amp|lt|gt|quot|apos|#\d+);)/.test(text), '未エスケープの & がある');
});

// ── 配信仕様（今回の計測修正で変えてはいけない部分）────────

test('記事件数と並び順がクエリの結果どおり', () => {
  const items = itemBlocks(feed);
  assert.equal(items.length, articles.length);
  const titles = tagValues(feed, 'title').slice(1); // 先頭は channel/title
  assert.equal(titles.length, articles.length);
});

test('link と guid は canonical URL で一致し、UTM が付いていない', () => {
  const items = itemBlocks(feed);
  const expected = articles.map((article) => {
    if (article._type !== 'quiz') return `${SITE}${article.slug}`;
    return article.category?.slug && !article.slug.includes('/')
      ? `${SITE}category/${article.category.slug}/${article.slug}`
      : `${SITE}quiz/${article.slug}`;
  });

  items.forEach((item, index) => {
    const link = item.match(/<link>([^<]+)<\/link>/)?.[1];
    const guid = item.match(/<guid isPermaLink="true">([^<]+)<\/guid>/)?.[1];
    assert.equal(link, expected[index], 'item.link が canonical URL と違う');
    assert.equal(guid, expected[index], 'item.guid が link と一致しない');
    // SmartFormat 仕様: canonical 相当のURLに計測パラメータを付けない
    assert.ok(!link.includes('utm_'), `link に UTM が付いている: ${link}`);
    assert.ok(!guid.includes('utm_'), `guid に UTM が付いている: ${guid}`);
  });
});

test('本文・画像・関連記事・広告枠の構造が維持されている', () => {
  const items = itemBlocks(feed);

  // 画像がある記事は本文冒頭に img、無い記事は img を出さない
  const withImage = items[0];
  assert.ok(/<content:encoded><!\[CDATA\[<img src="https:\/\/cdn\.sanity\.io\//.test(withImage));
  const noImage = items.find((item) => item.includes('画像が1枚も無いクイズ'));
  assert.ok(noImage && !noImage.includes('<img '), '画像が無い記事に img が出ている');

  // クイズは【問題】【解説】の見出しを持つ
  assert.ok(withImage.includes('<h2>【問題】</h2>'));
  assert.ok(withImage.includes('<h2>【解説】</h2>'));

  // 関連記事は本文末尾のテキストリンク + snf:relatedLink
  assert.ok(withImage.includes('<h3>関連記事</h3>'));
  assert.ok(withImage.includes('<snf:relatedLink link="https://noutorebiyori.com/'));
  const relatedCount = (feed.match(/<snf:relatedLink /g) ?? []).length;
  assert.equal(
    relatedCount,
    articles.reduce((sum, a) => sum + (a.relatedLinks?.length ?? 0), 0)
  );

  // 広告枠は1記事あたり最大2件
  for (const item of items) {
    const sponsored = (item.match(/<snf:sponsoredLink /g) ?? []).length;
    assert.ok(sponsored <= 2, 'snf:sponsoredLink が3件以上ある');
  }
  assert.ok(createSmartnewsFixtureLatestQuizzes().length >= 2);

  // media:thumbnail は全 item にある
  assert.equal((feed.match(/<media:thumbnail url="/g) ?? []).length, items.length);
});

test('本文中のリンクは本体サイトの canonical URL のまま（UTM を付けない）', () => {
  for (const href of [...feed.matchAll(/href="([^"]+)"/g)].map((m) => m[1])) {
    assert.ok(href.startsWith('https://noutorebiyori.com/'), href);
    assert.ok(!href.includes('utm_'), `本文リンクに UTM が付いている: ${href}`);
  }
});

// ── SmartView 計測 ────────────────────────────────────────

test('snf:analytics が全 item にあり、JavaScript は1つ', () => {
  const snippets = analyticsSnippets(feed);
  assert.equal(snippets.length, itemBlocks(feed).length);
  for (const snippet of snippets) {
    assert.equal((snippet.match(/<script\b/g) ?? []).length, 1);
    assert.equal((snippet.match(/<\/script>/g) ?? []).length, 1);
    assert.ok(snippet.includes(GA_ID), '測定IDが違う');
    assert.ok(!snippet.includes('http://'));
  }
});

test('SmartView の閲覧は page_view ではなく smartview_page_view で送る', () => {
  for (const snippet of analyticsSnippets(feed)) {
    assert.ok(snippet.includes('send_page_view:false'), 'page_view の自動送信が止まっていない');
    assert.ok(!/gtag\('event',"page_view"/.test(snippet), 'page_view を送っている');
    assert.ok(snippet.includes(`gtag('event',"smartview_page_view"`));
    assert.ok(snippet.includes('content_surface:"smartview"'));
    assert.ok(snippet.includes('distribution_platform:"smartnews"'));
    assert.ok(snippet.includes('campaign_source:"smartnews"'));
    assert.ok(snippet.includes('campaign_medium:"smartview"'));
  }
});

test('SmartView イベントに記事の識別情報が入っている', () => {
  const snippets = analyticsSnippets(feed);
  snippets.forEach((snippet, index) => {
    const article = articles[index];
    const path = snippet.match(/article_path:"([^"]+)"/)?.[1];
    const slug = snippet.match(/article_slug:"([^"]+)"/)?.[1];
    assert.ok(path?.startsWith('/'), 'article_path がパスになっていない');
    assert.equal(slug, article.slug);
    assert.ok(snippet.includes('article_title:'), 'article_title が無い');
    const pageLocation = snippet.match(/page_location:"([^"]+)"/)?.[1];
    assert.ok(pageLocation?.startsWith('https://noutorebiyori.com/'));
    assert.ok(!pageLocation.includes('utm_'), 'page_location に UTM が付いている');
  });
});

test('タイトルに特殊文字がある記事でも計測タグが壊れない', () => {
  const index = articles.findIndex((article) => article.title.includes('<'));
  assert.ok(index >= 0, 'テスト用の特殊文字入り記事が見つからない');
  const snippet = analyticsSnippets(feed)[index];
  assert.ok(!snippet.includes(']]>'));
  assert.ok(snippet.includes('\\u003c'), '< がエスケープされていない');
  const js = snippet.replace(/^<script>/, '').replace(/<\/script>$/, '');
  assert.doesNotThrow(() => new Function(js), 'JavaScript の構文が壊れている');
});
