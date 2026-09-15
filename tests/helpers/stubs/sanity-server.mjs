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
    // 記事本体のクエリだけが relatedLinks を投影している
    if (text.includes('relatedLinks')) return createSmartnewsFixtureArticles();
    // マッチ棒プールはスラッグ前方一致で絞り込んでいる
    if (text.includes('matchstick-quiz/')) return createSmartnewsFixtureMatchstickQuizzes();
    return createSmartnewsFixtureLatestQuizzes();
  },
};
