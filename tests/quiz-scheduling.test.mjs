import { test } from 'node:test';
import assert from 'node:assert/strict';

const ISO_PAST = '2024-01-20T00:00:00Z';
const ISO_FUTURE = '2099-05-05T00:00:00Z';
const ISO_CREATED = '2024-01-10T12:34:56Z';

const normalize = (value) => new Date(value).toISOString();

test('filterVisibleQuizzes applies effective published date rules', async (t) => {
  const { filterVisibleQuizzes, shouldRestrictToPublishedContent } = await import(
    '../src/lib/queries/quizVisibility.js'
  );

  t.mock.method(Date, 'now', () => new Date('2024-02-01T00:00:00Z').getTime());

  const source = [
    {
      _id: 'future-quiz',
      slug: 'future-quiz',
      publishedAt: ISO_FUTURE,
      _createdAt: ISO_CREATED
    },
    {
      _id: 'past-quiz',
      slug: 'past-quiz',
      publishedAt: ISO_PAST,
      _createdAt: ISO_PAST
    },
    {
      _id: 'fallback-quiz',
      slug: 'fallback-quiz',
      _createdAt: ISO_CREATED
    }
  ];

  const filtered = filterVisibleQuizzes(source);
  const slugs = new Set(filtered.map((quiz) => quiz.slug));

  assert.ok(slugs.has('past-quiz'), '過去日時のクイズは可視化される');
  assert.ok(slugs.has('fallback-quiz'), 'publishedAt 未設定でも _createdAt で可視化される');

  if (shouldRestrictToPublishedContent) {
    assert.ok(!slugs.has('future-quiz'), '未来日時のクイズは本番では非表示になる');
  } else {
    assert.ok(slugs.has('future-quiz'), 'プレビューでは未来日時のクイズも確認できる');
  }

  const sortedByEffective = filtered
    .slice()
    .sort(
      (a, b) =>
        new Date(b?.effectivePublishedAt ?? b?.publishedAt ?? 0).getTime() -
        new Date(a?.effectivePublishedAt ?? a?.publishedAt ?? 0).getTime()
    );

  const topSlug = sortedByEffective[0]?.slug ?? null;
  if (shouldRestrictToPublishedContent) {
    assert.strictEqual(topSlug, 'past-quiz', '本番では過去日時が最新扱いになる');
  } else {
    assert.strictEqual(topSlug, 'future-quiz', 'プレビューでは未来日時が先頭になる');
  }

  const fallback = filtered.find((quiz) => quiz.slug === 'fallback-quiz');
  assert.ok(fallback, 'フォールバック対象のクイズを取得できる');
  assert.strictEqual(
    normalize(fallback.effectivePublishedAt),
    normalize(ISO_CREATED),
    'effectivePublishedAt が _createdAt を反映する'
  );

  const past = filtered.find((quiz) => quiz.slug === 'past-quiz');
  assert.ok(past, '過去日時のクイズを取得できる');
  assert.strictEqual(
    normalize(past.effectivePublishedAt),
    normalize(ISO_PAST),
    'past クイズも effectivePublishedAt が publishedAt と一致する'
  );
});
