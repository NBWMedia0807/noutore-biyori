// tests/helpers/stubs/sanity-server.mjs
//
// `$lib/sanity.server.js` の差し替え版。
// GROQ クエリの中身を見て、対応するサンプル記事（scripts/fixtures/）を返す。

import {
  createSmartnewsFixtureArticles,
  createSmartnewsFixtureLatestQuizzes,
  createSmartnewsFixtureMatchstickQuizzes,
} from '../../../scripts/fixtures/smartnews-feed-docs.mjs';

export const previewDraftsEnabled = false;
export const shouldSkipSanityFetch = () => false;

export const client = {
  async fetch(query) {
    const text = String(query ?? '');
    // 記事本体のクエリだけが relatedLinks を投影している。
    // 配信記事はマッチ棒用と非マッチ棒用の2本に分かれている。
    if (text.includes('relatedLinks')) {
      const articles = createSmartnewsFixtureArticles();
      const isMatchstick = (a) => String(a.slug).startsWith('matchstick-quiz/');
      return text.includes('!(string::startsWith')
        ? articles.filter((a) => !isMatchstick(a))
        : articles.filter(isMatchstick);
    }
    // 回遊枠のマッチ棒プールはスラッグ前方一致で絞り込んでいる
    if (text.includes('matchstick-quiz/')) return createSmartnewsFixtureMatchstickQuizzes();
    return createSmartnewsFixtureLatestQuizzes();
  },
};
