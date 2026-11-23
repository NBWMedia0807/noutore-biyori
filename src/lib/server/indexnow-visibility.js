// IndexNow に載せてよいクイズかどうか。
// ページと同じく、publishedAt（無ければ _createdAt）が現在以前で、承認済みの公開ドキュメントだけ。
// 日付だけの publishedAt（例: 2026-11-23）は resolvePublishInfo と同じく UTC 深夜として比較する。
// 公開時刻そのものに再送するタイマーは持たない。時刻を過ぎたあとの webhook が改めて送る。

import { resolvePublishInfo } from '$lib/utils/publishedDate.js';

export const isIndexNowEligibleQuiz = (doc, now = Date.now()) => {
  if (!doc || typeof doc !== 'object') return false;
  const id = typeof doc._id === 'string' ? doc._id : '';
  if (id.startsWith('drafts.')) return false;
  if (doc.reviewStatus != null && doc.reviewStatus !== 'approved') return false;
  const { timestamp } = resolvePublishInfo(doc, doc.slug || id || 'indexnow');
  if (!Number.isFinite(timestamp)) return false;
  return timestamp <= now;
};

export const buildQuizIndexNowUrls = (baseUrl, quizzes, now = Date.now()) => {
  const origin = String(baseUrl || '').replace(/\/$/, '');
  const urls = [];
  const skipped = [];
  for (const quiz of Array.isArray(quizzes) ? quizzes : []) {
    const slug = typeof quiz?.slug === 'string' ? quiz.slug.trim() : '';
    if (!slug) continue;
    if (!isIndexNowEligibleQuiz(quiz, now)) {
      skipped.push(slug);
      continue;
    }
    urls.push(`${origin}/quiz/${slug}`);
    urls.push(`${origin}/quiz/${slug}/answer`);
  }
  return { urls, skipped };
};
