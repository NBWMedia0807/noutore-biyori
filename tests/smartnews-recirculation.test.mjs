import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AD_SLOT_COUNT,
  BODY_LINK_COUNT,
  MATCHSTICK_SLUG_PREFIX,
  RELATED_SLOT_COUNT,
  SMARTNEWS_RECIRCULATION_CONTENT,
  allocateRecirculationSlots,
  buildRecirculationUrl,
  escapeHtmlAttr,
  isMatchstickSlug,
} from '../src/lib/rss/smartnewsRecirculation.js';

// 配信側（+server.js）と同じ canonical URL の組み立て
const siteLink = 'https://noutorebiyori.com/';
const buildQuizUrl = (slug, categorySlug) =>
  categorySlug && !String(slug).includes('/')
    ? `${siteLink}category/${categorySlug}/${slug}`
    : `${siteLink}quiz/${slug}`;

/** 通常記事のプールを n 件作る（kanji-1, kanji-2, ...）。 */
const categoryQuizzes = (n, prefix = 'kanji') =>
  Array.from({ length: n }, (_, i) => ({
    _type: 'quiz',
    slug: `${prefix}-${i + 1}`,
    title: `${prefix} ${i + 1}`,
    categorySlug: 'kanji-quiz',
  }));

/** マッチ棒クイズのプールを n 件作る。 */
const matchstickQuizzes = (n) =>
  Array.from({ length: n }, (_, i) => ({
    _type: 'quiz',
    slug: `${MATCHSTICK_SLUG_PREFIX}article/${i + 1}`,
    title: `マッチ棒 ${i + 1}`,
  }));

const slugsOf = (slots) => slots.map((s) => s.slug);

const allSlugs = ({ adSlots, bodyLinks, relatedSlots }) => [
  ...slugsOf(adSlots),
  ...slugsOf(bodyLinks),
  ...slugsOf(relatedSlots),
];

test('マッチ棒判定はスラッグの前方一致で行う', () => {
  assert.equal(isMatchstickSlug('matchstick-quiz/article/336'), true);
  assert.equal(isMatchstickSlug('kanji-quiz-1'), false);
  // 前方一致なので途中に含まれるだけでは該当しない
  assert.equal(isMatchstickSlug('daily/matchstick-quiz/article/1'), false);
  assert.equal(isMatchstickSlug(undefined), false);
  assert.equal(isMatchstickSlug(null), false);
  assert.equal(isMatchstickSlug(''), false);
});

test('通常記事: 広告枠と本文末は同カテゴリ、関連記事枠はマッチ棒最新3件', () => {
  const result = allocateRecirculationSlots({
    article: { slug: 'kanji-0' },
    categoryPool: categoryQuizzes(8),
    matchstickPool: matchstickQuizzes(12),
    globalPool: categoryQuizzes(12, 'global'),
  });

  assert.deepEqual(slugsOf(result.adSlots), ['kanji-1', 'kanji-2']);
  assert.deepEqual(slugsOf(result.bodyLinks), ['kanji-3', 'kanji-4', 'kanji-5']);
  assert.deepEqual(slugsOf(result.relatedSlots), [
    `${MATCHSTICK_SLUG_PREFIX}article/1`,
    `${MATCHSTICK_SLUG_PREFIX}article/2`,
    `${MATCHSTICK_SLUG_PREFIX}article/3`,
  ]);
});

test('マッチ棒記事: 8枠すべてマッチ棒から 1-2 / 3-5 / 6-8 の順で取る', () => {
  const result = allocateRecirculationSlots({
    article: { slug: `${MATCHSTICK_SLUG_PREFIX}article/0` },
    categoryPool: categoryQuizzes(8),
    matchstickPool: matchstickQuizzes(12),
    globalPool: categoryQuizzes(12, 'global'),
  });

  const p = (n) => `${MATCHSTICK_SLUG_PREFIX}article/${n}`;
  assert.deepEqual(slugsOf(result.adSlots), [p(1), p(2)]);
  assert.deepEqual(slugsOf(result.bodyLinks), [p(3), p(4), p(5)]);
  assert.deepEqual(slugsOf(result.relatedSlots), [p(6), p(7), p(8)]);
});

test('表示中の記事は回遊枠に出ない', () => {
  const pool = matchstickQuizzes(12);
  const result = allocateRecirculationSlots({
    article: { slug: `${MATCHSTICK_SLUG_PREFIX}article/3` },
    categoryPool: [],
    matchstickPool: pool,
    globalPool: [],
  });

  assert.ok(
    !allSlugs(result).includes(`${MATCHSTICK_SLUG_PREFIX}article/3`),
    '表示中の記事が自分自身をレコメンドしていない'
  );
  assert.equal(allSlugs(result).length, 8, '自記事を飛ばしても8枠埋まる');
});

test('枠をまたいだ重複が出ない', () => {
  const result = allocateRecirculationSlots({
    article: { slug: 'kanji-0' },
    categoryPool: categoryQuizzes(8),
    matchstickPool: matchstickQuizzes(12),
    globalPool: categoryQuizzes(12, 'global'),
  });

  const slugs = allSlugs(result);
  assert.equal(slugs.length, AD_SLOT_COUNT + BODY_LINK_COUNT + RELATED_SLOT_COUNT);
  assert.equal(new Set(slugs).size, slugs.length, 'ユニーク8記事になっている');
});

test('同カテゴリのプールが浅くても全体新着で8枠埋まり、重複もしない', () => {
  // 同カテゴリ2件しかないケース。広告枠2 → 本文末は全体新着から補充される。
  const result = allocateRecirculationSlots({
    article: { slug: 'kanji-0' },
    categoryPool: categoryQuizzes(2),
    matchstickPool: matchstickQuizzes(3),
    globalPool: categoryQuizzes(12, 'global'),
  });

  const slugs = allSlugs(result);
  assert.equal(slugs.length, 8, '空き枠が出ない');
  assert.equal(new Set(slugs).size, 8, 'フォールバック経由でも重複しない');
  assert.deepEqual(slugsOf(result.adSlots), ['kanji-1', 'kanji-2']);
  assert.deepEqual(slugsOf(result.bodyLinks), ['global-1', 'global-2', 'global-3']);
});

test('全体新着にマッチ棒が含まれていても関連記事枠と二重にならない', () => {
  const sticks = matchstickQuizzes(3);
  const result = allocateRecirculationSlots({
    article: { slug: 'kanji-0' },
    // 同カテゴリが空なので、広告枠・本文末は globalPool から取られる
    categoryPool: [],
    matchstickPool: sticks,
    // 全体新着の先頭にマッチ棒（＝関連記事枠で使う記事）が並んでいる状況
    globalPool: [...sticks, ...categoryQuizzes(12, 'global')],
  });

  const slugs = allSlugs(result);
  assert.equal(new Set(slugs).size, slugs.length, '重複していない');
  assert.deepEqual(
    slugsOf(result.relatedSlots),
    sticks.map((s) => s.slug)
  );
  assert.deepEqual(slugsOf(result.adSlots), ['global-1', 'global-2']);
});

test('マッチ棒が3件未満でも他カテゴリで関連記事枠を埋める', () => {
  const result = allocateRecirculationSlots({
    article: { slug: 'kanji-0' },
    categoryPool: categoryQuizzes(8),
    matchstickPool: matchstickQuizzes(1),
    globalPool: categoryQuizzes(12, 'global'),
  });

  assert.equal(result.relatedSlots.length, RELATED_SLOT_COUNT);
  assert.equal(result.relatedSlots[0].slug, `${MATCHSTICK_SLUG_PREFIX}article/1`);
  // 残り2枠は同カテゴリから補充され、広告枠はその次から始まる
  assert.deepEqual(slugsOf(result.relatedSlots).slice(1), ['kanji-1', 'kanji-2']);
  assert.deepEqual(slugsOf(result.adSlots), ['kanji-3', 'kanji-4']);
});

test('本文末リンクは3本を超えない（SmartFormat ガイドライン）', () => {
  const result = allocateRecirculationSlots({
    article: { slug: 'kanji-0' },
    categoryPool: categoryQuizzes(50),
    matchstickPool: matchstickQuizzes(50),
    globalPool: categoryQuizzes(50, 'global'),
  });

  assert.equal(result.bodyLinks.length, 3);
  assert.equal(result.adSlots.length, 2);
  assert.equal(result.relatedSlots.length, 3);
});

test('プールが空でもフィードを壊さない', () => {
  const empty = allocateRecirculationSlots({ article: { slug: 'kanji-0' } });
  assert.deepEqual(empty, { adSlots: [], bodyLinks: [], relatedSlots: [] });

  const noArgs = allocateRecirculationSlots();
  assert.deepEqual(noArgs, { adSlots: [], bodyLinks: [], relatedSlots: [] });
});

test('タイトルやスラッグが欠けた記事は枠に出さない', () => {
  const result = allocateRecirculationSlots({
    article: { slug: 'kanji-0' },
    categoryPool: [
      { slug: 'broken-1' }, // title なし
      { title: 'タイトルのみ' }, // slug なし
      null,
      ...categoryQuizzes(5),
    ],
    matchstickPool: [],
    globalPool: [],
  });

  // マッチ棒プールが空なので関連記事枠が同カテゴリの先頭3件を先に取り、広告枠はその次から。
  assert.deepEqual(slugsOf(result.relatedSlots), ['kanji-1', 'kanji-2', 'kanji-3']);
  assert.deepEqual(slugsOf(result.adSlots), ['kanji-4', 'kanji-5']);
  assert.ok(!allSlugs(result).includes('broken-1'), 'title 欠けは採用されない');
  assert.ok(!allSlugs(result).some((slug) => slug === undefined), 'slug 欠け・null が枠に入らない');
});

// ── リンクURLとエスケープ（UTM を足したことで & が入るようになった箇所）────

test('回遊枠のURLは枠ごとに utm_content が変わる', () => {
  const quiz = { slug: 'sample', title: 'サンプル', categorySlug: 'kanji-quiz' };

  const ad = new URL(
    buildRecirculationUrl(quiz, SMARTNEWS_RECIRCULATION_CONTENT.sponsoredLink, { buildQuizUrl })
  );
  assert.equal(ad.pathname, '/category/kanji-quiz/sample', 'canonical URL を指している');
  assert.equal(ad.searchParams.get('utm_source'), 'smartnews');
  assert.equal(ad.searchParams.get('utm_medium'), 'recirculation');
  assert.equal(ad.searchParams.get('utm_content'), 'sponsoredlink');

  const body = new URL(
    buildRecirculationUrl(quiz, SMARTNEWS_RECIRCULATION_CONTENT.bodyLink, { buildQuizUrl })
  );
  assert.equal(body.searchParams.get('utm_content'), 'bodylink');

  const related = new URL(
    buildRecirculationUrl(quiz, SMARTNEWS_RECIRCULATION_CONTENT.relatedLink, { buildQuizUrl })
  );
  assert.equal(related.searchParams.get('utm_content'), 'relatedlink');
});

test('categorySlug が無い記事は fallbackCategorySlug を使う', () => {
  const quiz = { slug: 'sample', title: 'サンプル' };
  const url = new URL(
    buildRecirculationUrl(quiz, SMARTNEWS_RECIRCULATION_CONTENT.bodyLink, {
      buildQuizUrl,
      fallbackCategorySlug: 'number-quiz',
    })
  );
  assert.equal(url.pathname, '/category/number-quiz/sample');
});

test('マッチ棒は複数セグメントのスラッグなので /quiz/ 配下のままURLを作る', () => {
  const quiz = { slug: `${MATCHSTICK_SLUG_PREFIX}article/336`, title: 'マッチ棒' };
  const url = new URL(
    buildRecirculationUrl(quiz, SMARTNEWS_RECIRCULATION_CONTENT.relatedLink, { buildQuizUrl })
  );
  assert.equal(url.pathname, `/quiz/${MATCHSTICK_SLUG_PREFIX}article/336`);
});

test('CDATA 内の href に生の & を残さない', () => {
  const quiz = { slug: 'sample', title: 'サンプル', categorySlug: 'kanji-quiz' };
  const url = buildRecirculationUrl(quiz, SMARTNEWS_RECIRCULATION_CONTENT.bodyLink, {
    buildQuizUrl,
  });

  assert.ok(url.includes('&utm_medium='), '素のURLには & が入っている');

  const escaped = escapeHtmlAttr(url);
  assert.ok(escaped.includes('&amp;utm_medium='), '& が &amp; になっている');
  assert.ok(!/&(?!amp;)/.test(escaped), '未エスケープの & が残っていない');
  // 二重エスケープしていない（&amp;amp; になっていない）
  assert.ok(!escaped.includes('&amp;amp;'));
});

test('escapeHtmlAttr は属性を閉じてしまう " も潰す', () => {
  assert.equal(escapeHtmlAttr('a"b'), 'a&quot;b');
  assert.equal(escapeHtmlAttr('a&b"c'), 'a&amp;b&quot;c');
  assert.equal(escapeHtmlAttr(null), '');
  assert.equal(escapeHtmlAttr(undefined), '');
});
