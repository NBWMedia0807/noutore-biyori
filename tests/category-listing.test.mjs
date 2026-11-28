import assert from 'node:assert/strict';
import test from 'node:test';
import { isRedirect } from '@sveltejs/kit';
import { createMatchstickCategoryDescription, createPageSeo } from '../src/lib/seo.js';
import { resolveRequestedPage } from '../src/lib/server/pagination.js';

const category = '/category/matchstick-quiz';

const pageRedirects = [
  [`${category}?page=2?page=2`, `${category}?page=2`],
  [`${category}?page=2abc`, `${category}?page=2`],
  [`${category}?page=5?page=5`, `${category}?page=5`],
  ['/?page=2abc&utm_source=mail&tag=a&tag=b', '/?page=2&utm_source=mail&tag=a&tag=b'],
  ['/category/number-quiz?utm_source=mail&page=5abc', '/category/number-quiz?utm_source=mail&page=5'],
  ['/quiz?page=2abc', '/quiz?page=2']
];

for (const [input, location] of pageRedirects) {
  test(`301: ${input} → ${location}`, () => {
    assert.throws(
      () => resolveRequestedPage(new URL(input, 'https://noutorebiyori.com')),
      (error) => isRedirect(error) && error.status === 301 && error.location === location
    );
  });
}

test('正規のクエリはそのまま使い、先頭に数字がない値は1ページ目を表示する', () => {
  for (const [query, page] of [['?page=2&utm_source=mail', 2], ['?page=1', 1], ['', 1], ['?page=abc2', 1]]) {
    const url = new URL(query, 'https://noutorebiyori.com');
    assert.equal(resolveRequestedPage(url), page);
    assert.equal(url.search, query);
  }
});

test('マッチ棒カテゴリのメタ説明は公開件数を反映し、文として完結する', () => {
  for (const count of [886, 887]) {
    const seo = createPageSeo({
      path: category,
      description: createMatchstickCategoryDescription(count),
      appendSiteDescription: false
    });
    assert.equal(
      seo.description,
      `公開中のマッチ棒クイズ${count}問の一覧です。マッチ棒を1本動かして、正しい式に直すパズルに挑戦できます。`
    );
    assert.equal(seo.canonical, `https://noutorebiyori.com${category}`);
  }
});

test('既存のマッチ棒カテゴリ文にサイト紹介を補う場合も、読点より文末を優先する', () => {
  const overview = 'シンプルなマッチ棒を使って、頭を柔らかくひねるクイズに挑戦！数字や図形を動かして答えを導き出す人気のパズルです。論理的思考や発想力を鍛えながら、ひらめきの瞬間を楽しめます。';
  assert.equal(createPageSeo({ description: overview }).description, `${overview}楽しく脳を鍛える無料の脳トレサイト。`);
});
