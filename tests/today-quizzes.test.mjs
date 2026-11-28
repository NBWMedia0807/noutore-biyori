import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { selectTodayQuizzes } from '../src/lib/utils/todayQuizzes.js';

const quiz = (slug, publishedAt, category = slug) => ({
  slug, title: `元のタイトル ${slug}`, publishedAt, category: { slug: category }
});
const midnight = new Date('2026-11-23T15:00:00Z');
const beforeMidnight = quiz('yesterday', '2026-11-23T14:59:59Z');
const atMidnight = quiz('today', midnight.toISOString());
const future = quiz('future', '2026-11-23T15:00:01Z');

test('日本時間の0時で当日を切り替え、公開前の記事を除く', () => {
  const result = selectTodayQuizzes(1, [beforeMidnight, future, atMidnight], [], midnight);
  assert.equal(result.dateLabel, '2026/11/24');
  assert.equal(result.hasToday, true);
  assert.deepEqual(result.quizzes, [atMidnight]);
  const earlier = selectTodayQuizzes(1, [beforeMidnight, atMidnight], [], new Date(midnight - 1));
  assert.deepEqual(earlier.quizzes, [beforeMidnight]);
});

test('本日分がなければ公開済みの直近を返し、2ページ目には表示データを返さない', () => {
  const result = selectTodayQuizzes(1, [future, beforeMidnight], [], midnight);
  assert.equal(result.hasToday, false);
  assert.deepEqual(result.quizzes, [beforeMidnight]);
  assert.deepEqual(selectTodayQuizzes(1, [future], [], midnight).quizzes, []);
  assert.equal(selectTodayQuizzes(2, [atMidnight], [], midnight), null);
});

test('カテゴリ別の候補を含め、カテゴリごとに最新の1問を最大6問まで選ぶ', () => {
  const newest = quiz('newest', midnight.toISOString(), 'today');
  const older = quiz('older', '2026-11-23T15:00:00Z', 'today');
  const others = Array.from({ length: 7 }, (_, i) => quiz(`category-${i}`, midnight.toISOString()));
  const later = new Date('2026-11-23T16:00:00Z');
  newest.publishedAt = later.toISOString();
  const result = selectTodayQuizzes(1, [older], [{ quizzes: [newest, ...others] }], later);
  assert.deepEqual(result.quizzes, [newest, ...others.slice(0, 5)]);
});

test('トップのHTMLキャッシュ設定を維持する', () => {
  const source = readFileSync(new URL('../src/routes/+page.server.js', import.meta.url), 'utf8');
  assert.ok(source.includes("'cache-control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400'"));
});
