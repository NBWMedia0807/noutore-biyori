// tests/gunosy-feed.test.mjs
//
// GunosyFeed（仕様書 ver 3.2.4）とコンテンツ掲載ガイドラインへの適合テスト。
// Sanity にもネットワークにも触れず、サンプル記事から組み立てた XML を検証する。
//
//   pnpm run test:gunosy

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildGunosyFeed,
  buildGuid,
  resolveModifiedDate,
  toGunosyItem,
} from '../src/lib/rss/gunosyFeed.js';
import { createFixtureDocs } from '../scripts/fixtures/gunosy-feed-docs.mjs';
import { validateGunosyFeed } from '../scripts/validate-gunosy-feed.mjs';

const GA_ID = 'G-855Y7S6M95';

const buildFixtureFeed = (options = {}) => {
  const now = options.now ?? new Date();
  const { docs, buildImageUrl } = createFixtureDocs({ now });
  return {
    xml: buildGunosyFeed(options.docs ?? docs, { buildImageUrl, gaMeasurementId: GA_ID, now }),
    docs,
    buildImageUrl,
    now,
  };
};

const contentSections = (xml) =>
  [...xml.matchAll(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/g)].map(
    (m) => m[1]
  );

const itemBlocks = (xml) => [...xml.matchAll(/<item>[\s\S]*?<\/item>/g)].map((m) => m[0]);

test('サンプル記事から生成したフィードはセルフチェックでエラー0件', () => {
  const { xml } = buildFixtureFeed();
  const { errors, itemCount } = validateGunosyFeed(xml);
  assert.deepEqual(errors, [], `エラー: ${JSON.stringify(errors, null, 2)}`);
  assert.equal(itemCount, 5);
});

test('rss 要素に gnf / content / dc / media の4名前空間が入っている', () => {
  const { xml } = buildFixtureFeed();
  assert.match(xml, /xmlns:gnf="http:\/\/assets\.gunosy\.com\/media\/gnf"/);
  assert.match(xml, /xmlns:content="http:\/\/purl\.org\/rss\/1\.0\/modules\/content\/"/);
  assert.match(xml, /xmlns:dc="http:\/\/purl\.org\/dc\/elements\/1\.1\/"/);
  assert.match(xml, /xmlns:media="http:\/\/search\.yahoo\.com\/mrss\/"/);
});

test('channel の description は35文字以内', () => {
  const { xml } = buildFixtureFeed();
  const description = xml.match(/<channel>[\s\S]*?<description>([\s\S]*?)<\/description>/)[1];
  assert.ok([...description].length <= 35, `${[...description].length} 文字`);
});

test('channel に正方形ロゴと横長ロゴが入っている', () => {
  const { xml } = buildFixtureFeed();
  assert.match(
    xml,
    /<image>\s*<url>https:\/\/[^<]+<\/url>\s*<title>[^<]+<\/title>\s*<link>https:\/\/[^<]+<\/link>\s*<\/image>/
  );
  assert.match(
    xml,
    /<gnf:wide_image_link>https:\/\/noutorebiyori\.com\/logo-wide\.png<\/gnf:wide_image_link>/
  );
});

test('title のエスケープ漏れがない', () => {
  const { xml } = buildFixtureFeed();
  const titles = [...xml.matchAll(/<title>([\s\S]*?)<\/title>/g)].map((m) => m[1]);
  const escaped = titles.find((value) => value.includes('&amp;'));
  assert.ok(escaped, '& を含むサンプル記事のタイトルが見つからない');
  assert.match(escaped, /&lt;記号&gt;/);
  assert.match(escaped, /&quot;難読&quot;/);
  // 生の & < > " が残っていないこと
  for (const value of titles) {
    assert.ok(!/&(?!(amp|lt|gt|quot|apos|#\d+);)/.test(value), `未エスケープの & : ${value}`);
    assert.ok(!value.includes('<'), `未エスケープの < : ${value}`);
  }
});

test('guid は URL 形式ではなく、スラッグやカテゴリを変えても不変', () => {
  const { xml } = buildFixtureFeed();
  const guids = [...xml.matchAll(/<guid isPermaLink="false">([^<]+)<\/guid>/g)].map((m) => m[1]);
  assert.equal(guids.length, 5);
  for (const guid of guids) assert.ok(!/^https?:\/\//.test(guid), guid);
  assert.equal(new Set(guids).size, guids.length, 'guid が重複している');

  const doc = { _id: 'quiz-abc-123', slug: 'old-slug' };
  assert.equal(buildGuid(doc, 'old-slug'), buildGuid({ ...doc, slug: 'new-slug' }, 'new-slug'));
});

test('item は仕様書に無い要素（description 等）を出力しない', () => {
  const { xml } = buildFixtureFeed();
  for (const item of itemBlocks(xml)) {
    assert.ok(!/<description>/.test(item), 'item に description が残っている');
    assert.ok(!/<gnf:category|<gnf:keyword/.test(item), 'ver 3.2 で削除された要素が残っている');
  }
});

test('item の必須要素がすべて揃っている', () => {
  const { xml } = buildFixtureFeed();
  for (const item of itemBlocks(xml)) {
    for (const pattern of [
      /<title>/,
      /<link>https:\/\//,
      /<guid /,
      /<content:encoded>/,
      /<media:status state="active" \/>/,
      /<pubDate>/,
    ]) {
      assert.match(item, pattern);
    }
  }
});

test('pubDate と gnf:modified は RFC822（+0900）形式', () => {
  const { xml } = buildFixtureFeed();
  const dates = [...xml.matchAll(/<(?:pubDate|gnf:modified|lastBuildDate)>([^<]+)</g)].map(
    (m) => m[1]
  );
  assert.ok(dates.length > 0);
  for (const value of dates) {
    assert.match(
      value,
      /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} \+0900$/
    );
  }
});

test('gnf:modified は pubDate より前にならない', () => {
  const published = '2026-08-27T09:00:00+09:00';
  // 前日に編集して翌朝公開する運用（_updatedAt < publishedAt）は公開日にクランプする
  assert.equal(
    resolveModifiedDate('2026-08-26T09:49:19+09:00', published)?.toISOString(),
    new Date(published).toISOString()
  );
  // 公開後の編集はそのまま通す（更新の検知に影響させない）
  const edited = '2026-08-28T10:00:00+09:00';
  assert.equal(
    resolveModifiedDate(edited, published)?.toISOString(),
    new Date(edited).toISOString()
  );
  assert.equal(
    resolveModifiedDate(null, published)?.toISOString(),
    new Date(published).toISOString()
  );
  assert.equal(resolveModifiedDate(null, null), null);
});

test('フィード全体でも gnf:modified >= pubDate になっている', () => {
  const now = new Date('2026-08-27T04:00:00Z');
  const { docs, buildImageUrl } = createFixtureDocs({ now });
  // 実データと同じ「前日編集・翌朝公開」の形にする
  const scheduled = docs.map((doc) => ({
    ...doc,
    publishedAt: now.toISOString(),
    _createdAt: now.toISOString(),
    _updatedAt: new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString(),
  }));
  const xml = buildGunosyFeed(scheduled, { buildImageUrl, gaMeasurementId: GA_ID, now });

  for (const item of itemBlocks(xml)) {
    const pubDate = new Date(item.match(/<pubDate>([^<]+)<\/pubDate>/)[1]);
    const modified = new Date(item.match(/<gnf:modified>([^<]+)<\/gnf:modified>/)[1]);
    assert.ok(
      modified.getTime() >= pubDate.getTime(),
      `gnf:modified が pubDate より前: ${modified.toISOString()} < ${pubDate.toISOString()}`
    );
  }
  const stray = validateGunosyFeed(xml, { now }).warnings.filter((w) =>
    w.message.includes('gnf:modified')
  );
  assert.deepEqual(stray, [], JSON.stringify(stray, null, 2));
});

test('本文にリンク・script・style 属性が入らない（ガイドライン 2.3.1 / 禁止タグ）', () => {
  const { xml } = buildFixtureFeed();
  const sections = contentSections(xml);
  assert.equal(sections.length, 5);
  for (const html of sections) {
    assert.ok(!/<a[\s>]/i.test(html), `本文にリンクがある: ${html.slice(0, 80)}`);
    assert.ok(!/<script/i.test(html), '本文に script がある');
    assert.ok(!/\sstyle\s*=/i.test(html), '本文に style 属性がある');
    assert.ok(!/<br\s*\/?>\s*<br/i.test(html), '<br /> が連続している');
  }
  // リンクマークが付いていたテキストは、リンクを外した本文として残る
  const linked = sections.find((html) => html.includes('答えはこちらの記事'));
  assert.ok(linked, 'リンクマーク付きテキストが本文から消えている');
  assert.ok(!linked.includes('example.com'), 'リンク先URLが本文に残っている');
});

test('本文は全文（問題・ヒント・解答）を含み、地の文は <p> で囲まれている', () => {
  const { xml } = buildFixtureFeed();
  const [first] = contentSections(xml);
  assert.match(first, /<h2>問題<\/h2>/);
  assert.match(first, /<h2>ヒント<\/h2>/);
  assert.match(first, /<h2>解答<\/h2>/);
  assert.match(first, /<figure><img src="https:\/\/[^"]+" alt="[^"]*" \/>/);
  assert.ok(!/>\s*[^<\s][^<]*<h2/.test(first), 'タグの外に地の文がある');
});

test('箇条書きは <li> ではなく <p> で出力する', () => {
  // 公式バリデータは <li> 直下のテキストを
  // 「<p>タグで囲まれていないテキストが存在します」として指摘する
  const { xml } = buildFixtureFeed();
  for (const html of contentSections(xml)) {
    assert.ok(!/<li[\s>]/i.test(html), `<li> が残っている: ${html.slice(0, 80)}`);
    assert.ok(!/<[uo]l[\s>]/i.test(html), '<ul>/<ol> が残っている');
  }
  const [first] = contentSections(xml);
  assert.match(first, /<p>・記号に注目してみましょう<\/p><p>・数字の形も変えられます<\/p>/);
});

test('本文のテキストは <p>・見出し・figcaption のいずれかに収まっている', () => {
  const { xml } = buildFixtureFeed();
  const { warnings } = validateGunosyFeed(xml);
  const stray = warnings.filter((w) => w.message.includes('<p> で囲まれていない'));
  assert.deepEqual(stray, [], JSON.stringify(stray, null, 2));
});

test('セルフチェッカーが <li> 直下のテキストを検出する', () => {
  const { xml } = buildFixtureFeed();
  const broken = xml.replace(
    '<p>・記号に注目してみましょう</p><p>・数字の形も変えられます</p>',
    '<ul><li>記号に注目してみましょう</li><li>数字の形も変えられます</li></ul>'
  );
  const stray = validateGunosyFeed(broken).warnings.filter((w) => w.message.includes('<li>'));
  assert.equal(stray.length, 2, JSON.stringify(validateGunosyFeed(broken).warnings, null, 2));
});

test('gnf:relatedLink は最大3件で、非公開の関連記事は除外される', () => {
  const { xml } = buildFixtureFeed();
  const items = itemBlocks(xml);
  const counts = items.map((item) => (item.match(/<gnf:relatedLink /g) ?? []).length);
  assert.ok(Math.max(...counts) <= 3, `関連記事が4件以上ある: ${counts}`);
  assert.equal(counts[0], 3, '手動＋自動で3件まで埋まっていない');

  // 4件目の記事は visible:false の関連記事を1件持つ
  const spotItem = items.find((item) => item.includes('spot-004'));
  assert.ok(!spotItem.includes('related-quiz-7'), '非公開の関連記事が出力されている');
  assert.ok(spotItem.includes('related-quiz-8'), '公開中の関連記事が出力されていない');
});

test('画像が無い記事は enclosure を出さない（ロゴで代替しない）', () => {
  const { xml } = buildFixtureFeed();
  const noImageItem = itemBlocks(xml).find((item) => item.includes('calc-003'));
  assert.ok(noImageItem, '画像なしのサンプル記事が見つからない');
  assert.ok(!noImageItem.includes('<enclosure'), 'enclosure が出力されている');
  assert.ok(!noImageItem.includes('logo.png'), 'サイトロゴで代替されている');
});

test('enclosure は1件・type と length 付き', () => {
  const { xml } = buildFixtureFeed();
  for (const item of itemBlocks(xml)) {
    const enclosures = item.match(/<enclosure [^>]*\/>/g) ?? [];
    assert.ok(enclosures.length <= 1, 'enclosure が複数ある');
    for (const enclosure of enclosures) {
      assert.match(enclosure, /url="https:\/\/[^"]+"/);
      assert.match(enclosure, /type="image\/jpeg"/);
      assert.match(enclosure, /length="0"/);
    }
  }
});

test('広告・スポンサーリンクの類は出力しない', () => {
  const { xml } = buildFixtureFeed();
  assert.ok(!/sponsored|advertisement/i.test(xml));
});

test('アクセス解析タグは3アプリ分あり、それぞれ script は1つ', () => {
  const { xml } = buildFixtureFeed();
  for (const name of ['gnf:analytics_gn', 'gnf:analytics', 'gnf:analytics_st']) {
    const pattern = new RegExp(`<${name}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${name}>`, 'g');
    const matches = [...xml.matchAll(pattern)];
    assert.equal(matches.length, 5, `${name} の数が item 数と一致しない`);
    for (const [, snippet] of matches) {
      assert.equal((snippet.match(/<script\b/g) ?? []).length, 1);
      assert.ok(snippet.includes(GA_ID));
      assert.ok(!snippet.includes('http://'), '計測タグに http:// がある');
    }
  }
});

test('GA の測定IDが未設定なら計測タグを出さない', () => {
  const { docs, buildImageUrl } = createFixtureDocs();
  const xml = buildGunosyFeed(docs, { buildImageUrl, gaMeasurementId: 'G-XXXXXXXXXX' });
  assert.ok(!xml.includes('gnf:analytics'));
  assert.deepEqual(validateGunosyFeed(xml).errors, []);
});

test('公開から10日を超えた記事は配信対象から外れる', () => {
  const now = new Date('2026-08-27T00:00:00Z');
  const { docs, buildImageUrl } = createFixtureDocs({ now });
  const old = docs.map((doc, index) => ({
    ...doc,
    // 先頭6件相当のうち3件を古くする
    publishedAt: index < 3 ? '2026-01-01T00:00:00Z' : doc.publishedAt,
    _createdAt: index < 3 ? '2026-01-01T00:00:00Z' : doc._createdAt,
  }));
  // 新しい記事を10件足して「10日以内が MIN_ITEMS 件以上」の状態を作る
  const fresh = Array.from({ length: 10 }, (_, i) => ({
    ...docs[4],
    _id: `quiz-fresh-${i}`,
    slug: `fresh-${i}`,
    title: `新着クイズ ${i}`,
    publishedAt: new Date(now.getTime() - (i + 1) * 60 * 60 * 1000).toISOString(),
    _updatedAt: new Date(now.getTime() - (i + 1) * 60 * 60 * 1000).toISOString(),
  }));

  const xml = buildGunosyFeed([...fresh, ...old], { buildImageUrl, gaMeasurementId: GA_ID, now });
  assert.ok(!xml.includes('Jan 2026'), '古い日付が残っている');
  assert.ok(!xml.includes('matchstick-001'), '10日より前の記事が残っている');
  assert.equal(itemBlocks(xml).length, 12, '10日以内の記事だけが残っていない');
  assert.deepEqual(validateGunosyFeed(xml, { now }).errors, []);
});

test('10日以内の記事が少ないときもフィードを空にしない', () => {
  const now = new Date('2026-08-27T00:00:00Z');
  const { docs, buildImageUrl } = createFixtureDocs({ now });
  const allOld = docs.map((doc) => ({
    ...doc,
    publishedAt: '2026-01-01T00:00:00Z',
    _createdAt: '2026-01-01T00:00:00Z',
  }));
  const xml = buildGunosyFeed(allOld, { buildImageUrl, gaMeasurementId: GA_ID, now });
  assert.equal(itemBlocks(xml).length, 5, '古い記事しか無いときに item が消えている');
});

test('同じ記事が重複して届いても item は1件に寄せる', () => {
  const { docs, buildImageUrl } = createFixtureDocs();
  const xml = buildGunosyFeed([docs[0], { ...docs[0] }, docs[1]], {
    buildImageUrl,
    gaMeasurementId: GA_ID,
  });
  assert.equal(itemBlocks(xml).length, 2);
});

test('URL が256文字以上になる記事は配信しない', () => {
  const { buildImageUrl } = createFixtureDocs();
  const doc = {
    _id: 'quiz-long',
    title: '長すぎるURLの記事',
    slug: 'a'.repeat(240),
    publishedAt: new Date().toISOString(),
    category: { slug: 'number-quiz' },
    problemDescription: [{ _type: 'block', children: [{ _type: 'span', text: '本文' }] }],
  };
  assert.equal(toGunosyItem(doc, { buildImageUrl, gaMeasurementId: GA_ID }), null);
});

// ---- セルフチェッカー自体が問題を検出できることの確認 ----

const brokenCases = [
  ['名前空間の指定漏れ', (xml) => xml.replace(/\s*xmlns:gnf="[^"]*"/, '')],
  [
    'channel description が35文字超',
    (xml) =>
      xml.replace(
        /<description>[^<]*<\/description>/,
        `<description>${'あ'.repeat(40)}</description>`
      ),
  ],
  [
    'guid が URL 形式',
    (xml) =>
      xml.replace(
        /<guid isPermaLink="false">[^<]*<\/guid>/,
        '<guid isPermaLink="true">https://noutorebiyori.com/a</guid>'
      ),
  ],
  [
    'pubDate が RFC822 でない',
    (xml) => xml.replace(/<pubDate>[^<]*<\/pubDate>/, '<pubDate>2026-08-27 10:00:00</pubDate>'),
  ],
  ['media:status が無い', (xml) => xml.replace('<media:status state="active" />', '')],
  [
    '本文に script がある',
    (xml) => xml.replace('<h2>問題</h2>', '<h2>問題</h2><script>alert(1)</script>'),
  ],
  [
    '本文に style 属性がある',
    (xml) => xml.replace('<h2>問題</h2>', '<p style="width:100px">a</p>'),
  ],
  [
    '画像URLが http',
    (xml) => xml.replace('<gnf:wide_image_link>https://', '<gnf:wide_image_link>http://'),
  ],
  ['XML が壊れている', (xml) => xml.replace('</channel>', '')],
  [
    'エスケープ漏れの &',
    (xml) => xml.replace(/<title>脳トレ日和<\/title>/, '<title>脳トレ & 日和</title>'),
  ],
];

for (const [label, mutate] of brokenCases) {
  test(`セルフチェッカーが検出する: ${label}`, () => {
    const { xml } = buildFixtureFeed();
    const { errors } = validateGunosyFeed(mutate(xml));
    assert.ok(errors.length > 0, `検出できていない: ${label}`);
  });
}

test('セルフチェッカーが gnf:relatedLink 4件以上を検出する', () => {
  const { xml } = buildFixtureFeed();
  const extra = '<gnf:relatedLink title="4件目" link="https://noutorebiyori.com/category/x/y" />';
  const broken = xml.replace('</content:encoded>', `</content:encoded>\n    ${extra}`);
  const { errors } = validateGunosyFeed(broken);
  assert.ok(
    errors.some((e) => e.message.includes('gnf:relatedLink')),
    JSON.stringify(errors)
  );
});
