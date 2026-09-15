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
  // snf:relatedLink は記事ごとに最大3件（マッチ棒の推し枠）。
  // 以前は article.relatedLinks の件数と一致していたが、本文末リンクと枠を分けたため
  // 「同カテゴリの関連記事の件数」とは独立になった。
  for (const item of items) {
    const related = (item.match(/<snf:relatedLink /g) ?? []).length;
    assert.ok(related <= 3, 'snf:relatedLink が4件以上ある');
  }

  // 広告枠は1記事あたり最大2件
  for (const item of items) {
    const sponsored = (item.match(/<snf:sponsoredLink /g) ?? []).length;
    assert.ok(sponsored <= 2, 'snf:sponsoredLink が3件以上ある');
  }
  assert.ok(createSmartnewsFixtureLatestQuizzes().length >= 2);

  // media:thumbnail は全 item にある
  assert.equal((feed.match(/<media:thumbnail url="/g) ?? []).length, items.length);
});

test('本文末の回遊リンクは本体サイト宛で、枠を識別する UTM が付く', () => {
  // SmartFormat 仕様で UTM を外すのは canonical 相当の <link> / <guid>（上のテストで固定）。
  // 本文末リンクは SmartView から本体サイトへ出ていく外向きリンクなので、
  // どの枠のクリックかを GA4 で見分けられるよう utm_content を付けている。
  const hrefs = [...feed.matchAll(/<a href="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(hrefs.length > 0, '本文末の回遊リンクが1本も出ていない');

  for (const href of hrefs) {
    assert.ok(href.startsWith('https://noutorebiyori.com/'), href);
    assert.ok(href.includes('utm_source=smartnews'), href);
    assert.ok(href.includes('utm_medium=recirculation'), href);
    assert.ok(href.includes('utm_content=bodylink'), href);
    // CDATA 内の HTML なので & は &amp; になっていること
    assert.ok(!/&(?!amp;)/.test(href), `未エスケープの & が残っている: ${href}`);
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

// ── 記事下の回遊枠（8枠ユニーク8記事）─────────────────────

/** item から枠ごとのリンク先パスを取り出す */
const slotPaths = (item) => {
  const paths = (regex) =>
    [...item.matchAll(regex)].map((m) => new URL(m[1].replace(/&amp;/g, '&')).pathname);
  return {
    ad: paths(/<snf:sponsoredLink link="([^"]+)"/g),
    body: paths(/<a href="([^"]+)"/g),
    related: paths(/<snf:relatedLink link="([^"]+)"/g),
  };
};

test('回遊枠は8枠すべて別々の記事を指す（自記事も含めて重複しない）', () => {
  itemBlocks(feed).forEach((item, index) => {
    const { ad, body, related } = slotPaths(item);
    const all = [...ad, ...body, ...related];
    assert.equal(new Set(all).size, all.length, `item[${index}] の枠が重複している`);

    const selfPath = new URL(item.match(/<link>([^<]+)<\/link>/)[1]).pathname;
    assert.ok(!all.includes(selfPath), `item[${index}] が自分自身をレコメンドしている`);
  });
});

test('マッチ棒以外の記事は関連記事枠がマッチ棒の推し枠になる', () => {
  itemBlocks(feed).forEach((item, index) => {
    const selfPath = new URL(item.match(/<link>([^<]+)<\/link>/)[1]).pathname;
    if (selfPath.startsWith('/quiz/matchstick-quiz/')) return;

    const { related } = slotPaths(item);
    assert.ok(related.length > 0, `item[${index}] の関連記事枠が空`);
    for (const path of related) {
      assert.ok(
        path.startsWith('/quiz/matchstick-quiz/'),
        `item[${index}] の関連記事枠にマッチ棒以外が入っている: ${path}`
      );
    }
  });
});

test('マッチ棒記事は8枠すべてマッチ棒から 1-2 / 3-5 / 6-8 の順で埋まる', () => {
  const item = itemBlocks(feed).find((block) =>
    block.includes('<link>https://noutorebiyori.com/quiz/matchstick-quiz/')
  );
  assert.ok(item, 'マッチ棒記事の item が無い');

  const { ad, body, related } = slotPaths(item);
  for (const path of [...ad, ...body, ...related]) {
    assert.ok(path.startsWith('/quiz/matchstick-quiz/'), `マッチ棒以外が入っている: ${path}`);
  }
  // プールの並び順どおりに 広告枠 → 本文末 → 関連記事枠 の順で取られる
  const order = [...ad, ...body, ...related];
  assert.deepEqual([...order].sort(), order, 'プールの順序どおりに割り当てられていない');
});

test('枠ごとに utm_content が分かれている', () => {
  const item = itemBlocks(feed)[0];
  const utmOf = (regex) =>
    [...item.matchAll(regex)].map((m) =>
      new URL(m[1].replace(/&amp;/g, '&')).searchParams.get('utm_content')
    );

  assert.deepEqual(
    new Set(utmOf(/<snf:sponsoredLink link="([^"]+)"/g)),
    new Set(['sponsoredlink'])
  );
  assert.deepEqual(new Set(utmOf(/<a href="([^"]+)"/g)), new Set(['bodylink']));
  assert.deepEqual(new Set(utmOf(/<snf:relatedLink link="([^"]+)"/g)), new Set(['relatedlink']));
});

test('XML 属性の UTM は & がエスケープされている', () => {
  for (const attr of [...feed.matchAll(/<snf:(?:sponsoredLink|relatedLink) link="([^"]+)"/g)]) {
    const link = attr[1];
    assert.ok(link.includes('&amp;utm_'), `& がエスケープされていない: ${link}`);
    assert.ok(!/&(?!amp;)/.test(link), `未エスケープの & が残っている: ${link}`);
  }
});

test('コラム記事（post）にも本文末の回遊リンクが出る', () => {
  const postArticle = articles.find((article) => article._type === 'post');
  assert.ok(postArticle, 'テスト用の post 記事が見つからない');

  const item = itemBlocks(feed).find((block) => block.includes(`/${postArticle.slug}</link>`));
  assert.ok(item, 'post の item が無い');

  const { ad, body, related } = slotPaths(item);
  assert.equal(body.length, 3, 'post の本文末リンクが3本出ていない');
  assert.equal(ad.length + body.length + related.length, 8, 'post の回遊枠が8枠になっていない');
  assert.ok(item.includes('<h3>関連記事</h3>'));
});
