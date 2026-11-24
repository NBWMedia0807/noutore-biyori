export function normalizeChallengePublishedAt(quiz) {
  const publishedAt = quiz.publishedAt || quiz._createdAt;
  return /^\d{4}-\d{2}-\d{2}$/.test(publishedAt) ? `${publishedAt}T00:00:00Z` : publishedAt;
}

// now を引数で受け取り、ローカルと本番で同じ公開日時の比較を行う。
export function selectNextChallenge(quiz, candidates, now) {
  const categorySlug = quiz.category?.slug;
  const currentTime = Date.parse(normalizeChallengePublishedAt(quiz));
  if (!categorySlug || !Number.isFinite(currentTime)) return null;

  let newer = null;
  let older = null;
  let newerTime = Infinity;
  let olderTime = -Infinity;

  for (const candidate of candidates) {
    if (
      !candidate?.slug ||
      candidate.slug === quiz.slug ||
      candidate.category?.slug !== categorySlug ||
      candidate.isRepublished === true ||
      candidate._id?.startsWith('drafts.') ||
      (candidate.reviewStatus != null && candidate.reviewStatus !== 'approved')
    ) {
      continue;
    }

    const time = Date.parse(normalizeChallengePublishedAt(candidate));
    if (!Number.isFinite(time) || time > now) continue;

    if (time > currentTime && time < newerTime) {
      newer = candidate;
      newerTime = time;
    }
    if (time < currentTime && time > olderTime) {
      older = candidate;
      olderTime = time;
    }
  }

  return newer ?? older;
}
