import { formatPublishedDateLabel, resolvePublishedTimestamp } from './publishedDate.js';

const MAX_QUIZZES = 6;

export function selectTodayQuizzes(page, newest, categories, now = new Date()) {
  if (page !== 1) return null;

  const dateLabel = formatPublishedDateLabel(now);
  const nowTimestamp = now.getTime();
  // 同じ記事が並ぶ場合は、カテゴリ一覧にある完全なプレビューを優先する。
  const published = [...categories.flatMap((category) => category.quizzes), ...newest]
    .map((quiz) => ({ quiz, timestamp: resolvePublishedTimestamp(quiz, quiz.slug) }))
    .filter(({ timestamp }) => timestamp <= nowTimestamp)
    .sort((a, b) => b.timestamp - a.timestamp);

  const today = published.filter(({ timestamp }) => formatPublishedDateLabel(timestamp) === dateLabel);
  const candidates = today.length ? today : published;
  const seenCategories = new Set();
  const quizzes = [];
  for (const { quiz } of candidates) {
    const category = quiz.category?.slug ?? '';
    if (seenCategories.has(category)) continue;
    seenCategories.add(category);
    quizzes.push(quiz);
    if (quizzes.length === MAX_QUIZZES) break;
  }

  return { dateLabel, hasToday: today.length > 0, quizzes };
}
