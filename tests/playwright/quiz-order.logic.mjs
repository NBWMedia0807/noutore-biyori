const toTimestamp = (value) => {
  if (!value) return Number.NaN;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
};

export const evaluateQuizOrdering = async () => {
  process.env.ENABLE_QUIZ_STUB = '1';
  process.env.SKIP_SANITY = '1';

  const [{ filterVisibleQuizzes, shouldRestrictToPublishedContent }, { getQuizStubCatalog }] =
    await Promise.all([
      import('../../src/lib/queries/quizVisibility.js'),
      import('../../src/lib/server/quiz-stub.js')
    ]);

  const fixedNow = Date.parse('2024-02-01T00:00:00Z');
  const originalNow = Date.now;
  Date.now = () => fixedNow;

  try {
    const stubCatalog = getQuizStubCatalog();

    const scheduledEntries = [
      {
        _id: 'future-sample',
        slug: 'future-sample',
        title: '未来公開のクイズ',
        publishedAt: '2099-05-05T00:00:00Z',
        _createdAt: '2024-01-15T00:00:00Z',
        _updatedAt: '2024-01-16T00:00:00Z'
      },
      {
        _id: 'fallback-sample',
        slug: 'fallback-sample',
        title: 'fallbackクイズ',
        _createdAt: '2024-01-12T12:34:56Z',
        _updatedAt: '2024-01-12T13:00:00Z'
      },
      {
        _id: 'past-sample',
        slug: 'past-sample',
        title: '過去公開クイズ',
        publishedAt: '2024-01-20T09:00:00+09:00',
        _createdAt: '2024-01-18T00:00:00Z',
        _updatedAt: '2024-01-21T00:00:00Z'
      }
    ];

    const combined = [...stubCatalog, ...scheduledEntries];
    const visible = filterVisibleQuizzes(combined);

    const sorted = visible.slice().sort((a, b) => {
      const aEffective = toTimestamp(a?.effectivePublishedAt ?? a?.publishedAt ?? null);
      const bEffective = toTimestamp(b?.effectivePublishedAt ?? b?.publishedAt ?? null);
      if (!Number.isNaN(bEffective - aEffective) && bEffective !== aEffective) {
        return bEffective - aEffective;
      }

      const aUpdated = toTimestamp(a?._updatedAt ?? a?.effectivePublishedAt ?? a?.publishedAt ?? null);
      const bUpdated = toTimestamp(b?._updatedAt ?? b?.effectivePublishedAt ?? b?.publishedAt ?? null);
      if (!Number.isNaN(bUpdated - aUpdated) && bUpdated !== aUpdated) {
        return bUpdated - aUpdated;
      }

      const aId = typeof a?._id === 'string' ? a._id : '';
      const bId = typeof b?._id === 'string' ? b._id : '';
      if (aId && bId && aId !== bId) {
        return bId.localeCompare(aId);
      }

      return 0;
    });

    const snapshot = sorted.map((quiz) => ({
      slug: quiz.slug,
      id: quiz._id ?? null,
      effectivePublishedAt: quiz.effectivePublishedAt ?? null,
      publishedAt: quiz.publishedAt ?? null,
      updatedAt: quiz._updatedAt ?? null
    }));

    const slugs = snapshot.map((entry) => entry.slug);
    const topSlug = snapshot[0]?.slug ?? null;

    return {
      snapshot,
      slugs,
      topSlug,
      shouldRestrictToPublishedContent,
      sortedLength: sorted.length
    };
  } finally {
    Date.now = originalNow;
  }
};
