// src/lib/cache/tags.js
// ページごとのキャッシュタグを統一的に管理します。

export const QUIZ_LIST_TAG = 'quiz:list';
export const QUIZ_SITEMAP_TAG = 'quiz:sitemap';

export const createQuizDetailTag = (slug) => (slug ? `quiz:detail:${slug}` : QUIZ_LIST_TAG);
export const createQuizAnswerTag = (slug) => (slug ? `quiz:answer:${slug}` : QUIZ_LIST_TAG);
export const createQuizCategoryTag = (slug) => (slug ? `quiz:category:${slug}` : QUIZ_LIST_TAG);

export const collectQuizTags = ({
  slugs = [],
  categorySlugs = [],
  includeList = true,
  includeSitemap = true
} = {}) => {
  const tags = new Set();

  if (includeList) {
    tags.add(QUIZ_LIST_TAG);
  }
  if (includeSitemap) {
    tags.add(QUIZ_SITEMAP_TAG);
  }

  for (const slug of slugs) {
    if (!slug) continue;
    tags.add(createQuizDetailTag(slug));
    tags.add(createQuizAnswerTag(slug));
  }

  for (const slug of categorySlugs) {
    if (!slug) continue;
    tags.add(createQuizCategoryTag(slug));
  }

  return Array.from(tags);
};
