// クイズ記事への内部リンクURL生成ヘルパー
//
// canonical URL は /category/[categorySlug]/[quizSlug]（/quiz/[slug] は 308 リダイレクト元）。
// 内部リンクをリダイレクト経由にすると、クリックごとの遅延と
// canonical ページへのリンク評価の分散が発生するため、
// カテゴリが判明している場合は canonical URL を直接生成する。

const normalizeSlug = (value) => {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.current === 'string') return value.current.trim();
  return '';
};

const resolveCategorySlug = (quiz) => {
  const candidates = [quiz?.category?.slug, quiz?.categorySlug];
  for (const candidate of candidates) {
    const slug = normalizeSlug(candidate);
    if (slug) return slug;
  }
  return '';
};

/**
 * クイズ問題ページへのURLを返す。
 * カテゴリスラッグが分かる場合は canonical（/category/[cat]/[slug]）、
 * 不明な場合や複数セグメントスラッグは /quiz/[slug]（サーバー側で正規化される）。
 * @param {object} quiz
 * @returns {string}
 */
export const quizHref = (quiz) => {
  const slug = normalizeSlug(quiz?.slug);
  if (!slug) return '#';
  const categorySlug = resolveCategorySlug(quiz);
  if (categorySlug && !slug.includes('/')) {
    return `/category/${categorySlug}/${slug}`;
  }
  return `/quiz/${slug}`;
};

/**
 * クイズ解答ページへのURLを返す（解答ルートは /quiz/[slug]/answer のみ存在）。
 * @param {object|string} quizOrSlug
 * @returns {string}
 */
export const quizAnswerHref = (quizOrSlug) => {
  const slug =
    typeof quizOrSlug === 'string' ? quizOrSlug.trim() : normalizeSlug(quizOrSlug?.slug);
  if (!slug) return '#';
  return `/quiz/${slug}/answer`;
};
