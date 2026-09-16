// tests/feed-slots.test.mjs
//
// SmartNews フィードの30枠の配分ロジックのテスト。
//
//   pnpm run test:feed-slots

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FRESHNESS_DAYS,
  LEAD_MATCHSTICK_ITEMS,
  MAX_CATEGORY_SLOTS,
  MAX_ITEMS,
  dedupeBySlug,
  selectSmartnewsItems,
} from '../src/lib/rss/feedSlots.js';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = new Date('2026-09-16T12:00:00.000Z');

const article = (slug, categorySlug, agoMs) => ({
  _id: `doc-${slug}`,
  slug,
  title: slug,
  publishedAt: new Date(NOW.getTime() - agoMs).toISOString(),
  category: categorySlug ? { slug: categorySlug, title: categorySlug } : null,
});

const matchsticks = (count, { agoStep = 5 * HOUR } = {}) =>
  Array.from({ length: count }, (_, i) =>
    article(`matchstick-quiz/m-${i}`, 'matchstick-quiz', i * agoStep)
  );

const CATEGORIES = [
  'kanji-quiz',
  'crossword-quiz',
  'yoji-quiz',
  'number-quiz',
  'arithmetic-quiz',
  'formula-puzzle',
  'anagram-quiz',
  'mushikui-quiz',
];

/** 各カテゴリ2本ずつ（新しい方が枠に入るはず） */
const freshOthers = () =>
  CATEGORIES.flatMap((slug, index) => [
    article(`${slug}-new`, slug, index * HOUR),
    article(`${slug}-old`, slug, index * HOUR + 1 * DAY),
  ]);

const run = (input, options) => selectSmartnewsItems(input, { now: NOW, ...options });
const isMatchstick = (item) => item.slug.startsWith('matchstick-quiz/');

// ── 基本の配分 ────────────────────────────────────────────

test('30枠を維持する', () => {
  const items = run({ matchstick: matchsticks(30), others: freshOthers() });
  assert.equal(items.length, MAX_ITEMS);
});

test('1〜10位はマッチ棒、11〜18位はカテゴリ枠、19〜30位はマッチ棒', () => {
  const items = run({ matchstick: matchsticks(30), others: freshOthers() });

  const lead = items.slice(0, LEAD_MATCHSTICK_ITEMS);
  const explore = items.slice(LEAD_MATCHSTICK_ITEMS, LEAD_MATCHSTICK_ITEMS + MAX_CATEGORY_SLOTS);
  const tail = items.slice(LEAD_MATCHSTICK_ITEMS + MAX_CATEGORY_SLOTS);

  assert.ok(lead.every(isMatchstick), '先頭10件がマッチ棒でない');
  assert.ok(!explore.some(isMatchstick), '探索枠にマッチ棒が混ざっている');
  assert.ok(tail.every(isMatchstick), '末尾がマッチ棒でない');
  assert.equal(tail.length, 12);
});

test('マッチ棒は合計22件', () => {
  const items = run({ matchstick: matchsticks(30), others: freshOthers() });
  assert.equal(items.filter(isMatchstick).length, 22);
});

test('カテゴリ枠は1カテゴリ1本ずつ・重複しない', () => {
  const items = run({ matchstick: matchsticks(30), others: freshOthers() });
  const explore = items.slice(LEAD_MATCHSTICK_ITEMS, LEAD_MATCHSTICK_ITEMS + MAX_CATEGORY_SLOTS);
  const slugs = explore.map((item) => item.category.slug);
  assert.equal(new Set(slugs).size, slugs.length, '同じカテゴリが2本入っている');
  assert.deepEqual([...slugs].sort(), [...CATEGORIES].sort());
});

test('カテゴリ枠に入るのはそのカテゴリの最新記事', () => {
  const items = run({ matchstick: matchsticks(30), others: freshOthers() });
  for (const item of items.filter((i) => !isMatchstick(i))) {
    assert.ok(item.slug.endsWith('-new'), `最新でない記事が入っている: ${item.slug}`);
  }
});

// ── 鮮度による除外 ────────────────────────────────────────

test('生成が止まったカテゴリの古い記事は入らない', () => {
  const others = [
    ...freshOthers(),
    article('time-quiz-1', 'time-quiz', 60 * DAY),
    article('money-quiz-1', 'money-quiz', 90 * DAY),
  ];
  const items = run({ matchstick: matchsticks(30), others });
  const slugs = items.map((item) => item.slug);
  assert.ok(!slugs.includes('time-quiz-1'), 'time-quiz が入っている');
  assert.ok(!slugs.includes('money-quiz-1'), 'money-quiz が入っている');
});

test('鮮度の境界（FRESHNESS_DAYS 以内なら入る / 超えたら入らない）', () => {
  const justInside = article('fresh-1', 'fresh-cat', FRESHNESS_DAYS * DAY - HOUR);
  const justOutside = article('stale-1', 'stale-cat', FRESHNESS_DAYS * DAY + HOUR);
  const items = run({ matchstick: matchsticks(30), others: [justInside, justOutside] });
  const slugs = items.map((item) => item.slug);
  assert.ok(slugs.includes('fresh-1'), '7日以内の記事が入っていない');
  assert.ok(!slugs.includes('stale-1'), '7日を超えた記事が入っている');
});

// ── カテゴリを持たない記事 ────────────────────────────────

test('カテゴリが無い記事（コラム等）はカテゴリ枠を取らない', () => {
  const others = [...freshOthers(), article('column-001', null, 1 * HOUR)];
  const items = run({ matchstick: matchsticks(30), others });
  assert.ok(!items.some((item) => item.slug === 'column-001'));
});

// ── 枠が埋まらないときの補充 ──────────────────────────────

test('カテゴリが8個に満たない分はマッチ棒で埋める', () => {
  const others = CATEGORIES.slice(0, 3).map((slug, i) => article(`${slug}-new`, slug, i * HOUR));
  const items = run({ matchstick: matchsticks(40), others });
  assert.equal(items.length, MAX_ITEMS);
  assert.equal(items.filter(isMatchstick).length, 27);
});

test('マッチ棒が足りないときは他カテゴリで埋める（30枠を維持）', () => {
  // 候補が30件以上あるようにカテゴリごとに4本用意する（5 + 32 = 37件）
  const others = CATEGORIES.flatMap((slug, index) =>
    Array.from({ length: 4 }, (_, n) => article(`${slug}-${n}`, slug, index * HOUR + n * DAY))
  );
  const items = run({ matchstick: matchsticks(5), others });
  assert.equal(items.length, MAX_ITEMS);
  assert.equal(items.filter(isMatchstick).length, 5);
  // 先頭はマッチ棒、続いて各カテゴリの最新1本、そのあとが補充
  assert.ok(items.slice(0, 5).every(isMatchstick));
  const explore = items.slice(5, 5 + MAX_CATEGORY_SLOTS);
  assert.equal(new Set(explore.map((item) => item.category.slug)).size, MAX_CATEGORY_SLOTS);
});

test('候補が30件に満たなければ、あるだけ出す（水増ししない）', () => {
  const items = run({ matchstick: matchsticks(5), others: freshOthers() });
  assert.equal(items.length, 5 + freshOthers().length);
  assert.equal(items.filter(isMatchstick).length, 5);
});

test('候補が少なければ出せるだけ出す（落ちない）', () => {
  const items = run({
    matchstick: matchsticks(2),
    others: [article('kanji-new', 'kanji-quiz', 0)],
  });
  assert.equal(items.length, 3);
});

test('候補が空でも落ちない', () => {
  assert.deepEqual(run({ matchstick: [], others: [] }), []);
  assert.deepEqual(run({}), []);
  assert.deepEqual(selectSmartnewsItems(), []);
});

// ── 重複の排除 ────────────────────────────────────────────

test('同じスラッグの記事は1件に寄せる', () => {
  const dup = [article('kanji-new', 'kanji-quiz', 0), article('kanji-new', 'kanji-quiz', 1 * HOUR)];
  const items = run({ matchstick: matchsticks(30), others: dup });
  assert.equal(items.filter((item) => item.slug === 'kanji-new').length, 1);
});

test('dedupeBySlug は最新の1件を残し、捨てた記事を通知する', () => {
  const dropped = [];
  const result = dedupeBySlug(
    [article('a', 'c', 0), article('a', 'c', HOUR), article('b', 'c', 0)],
    (item) => dropped.push(item.slug)
  );
  assert.deepEqual(
    result.map((item) => item.slug),
    ['a', 'b']
  );
  assert.deepEqual(dropped, ['a']);
});

test('スラッグが無い記事は捨てる', () => {
  const broken = [{ _id: 'x', title: 'no slug', publishedAt: NOW.toISOString() }];
  const items = run({ matchstick: matchsticks(30), others: broken });
  assert.equal(items.length, MAX_ITEMS);
  assert.ok(items.every((item) => item.slug));
});

// ── 選択された記事の中身は変えない ────────────────────────

test('記事オブジェクトは加工せずそのまま返す', () => {
  const source = matchsticks(30);
  const items = run({ matchstick: source, others: freshOthers() });
  assert.equal(items[0], source[0], '記事オブジェクトが差し替えられている');
});
