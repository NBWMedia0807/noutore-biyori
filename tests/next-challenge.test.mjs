import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeChallengePublishedAt, selectNextChallenge } from '../src/lib/utils/nextChallenge.js';

const quiz = {
  slug: 'current',
  category: { slug: 'matchstick' },
  publishedAt: '2024-02-10T00:00:00Z',
};
const now = Date.parse('2024-02-25T00:00:00Z');
const candidate = (slug, day, overrides = {}) => ({
  ...quiz,
  slug,
  publishedAt: `2024-02-${day}T00:00:00Z`,
  ...overrides,
});

test('selects the nearest newer quiz ahead of older quizzes', () => {
  const next = candidate('next', '12');
  assert.equal(
    selectNextChallenge(quiz, [candidate('later', '20'), candidate('older', '09'), next], now),
    next
  );
});

test('falls back to the nearest older quiz when current is the latest', () => {
  const previous = candidate('previous', '09');
  assert.equal(selectNextChallenge(quiz, [candidate('earlier', '05'), previous], now), previous);
});

test('selects the nearest newer quiz when both publication dates are date-only', () => {
  const current = { ...quiz, publishedAt: '2024-02-10' };
  const next = candidate('next', '12', { publishedAt: '2024-02-12' });
  const older = candidate('older', '09', { publishedAt: '2024-02-09' });
  assert.equal(selectNextChallenge(current, [older, next], now), next);
});

test('compares date-only and timed dates in both directions', () => {
  const midnight = candidate('midnight', '10', { publishedAt: '2024-02-10' });
  const later = candidate('later', '10', { publishedAt: '2024-02-10T01:00:00Z' });

  assert.equal(selectNextChallenge(midnight, [quiz, later], now), later);
  assert.equal(selectNextChallenge(later, [midnight], now), midnight);
  assert.equal(selectNextChallenge(quiz, [midnight], now), null);
});

test('normalizes date-only values, preserves timestamps and falls back to creation time', () => {
  assert.equal(normalizeChallengePublishedAt({ publishedAt: '2024-02-10' }), '2024-02-10T00:00:00Z');
  assert.equal(normalizeChallengePublishedAt(quiz), quiz.publishedAt);
  const current = { ...quiz, publishedAt: '', _createdAt: quiz.publishedAt };
  const next = candidate('next', '11');
  assert.equal(normalizeChallengePublishedAt(current), quiz.publishedAt);
  assert.equal(selectNextChallenge(current, [next], now), next);
});

test('ignores ineligible candidates and exact timestamp ties', () => {
  const candidates = [
    null,
    candidate('current', '11'),
    candidate('other-category', '11', { category: { slug: 'crossword' } }),
    candidate('republished', '11', { isRepublished: true }),
    candidate('draft', '11', { _id: 'drafts.quiz' }),
    candidate('retracted', '11', { reviewStatus: 'retracted' }),
    candidate('scheduled', '28'),
    candidate('same-time', '10'),
    candidate('invalid-date', '11', { publishedAt: 'invalid' }),
  ];

  assert.equal(selectNextChallenge(quiz, candidates, now), null);
});
