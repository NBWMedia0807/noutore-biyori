import { expect, test } from '@playwright/test';
import { evaluateQuizOrdering } from './quiz-order.logic.mjs';

test.describe('クイズ公開順序のスナップショット', () => {
  test('publishedAt / effectivePublishedAt の優先度が維持される', async () => {
    const { snapshot, slugs, topSlug, shouldRestrictToPublishedContent, sortedLength } =
      await evaluateQuizOrdering();

    if (shouldRestrictToPublishedContent) {
      expect(slugs).not.toContain('future-sample');
    } else {
      expect(topSlug).toBe('future-sample');
    }

    expect(sortedLength).toBeGreaterThan(0);
    expect(snapshot).toMatchSnapshot('quiz-order.json');
  });
});
