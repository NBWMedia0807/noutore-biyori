import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { compile } from 'svelte/compiler';
import { render } from 'svelte/server';

test('カードには元のタイトルと独立した正解リンクがある', async () => {
  const source = await readFile(new URL('../src/lib/components/ArticleCard.svelte', import.meta.url), 'utf8');
  const { js } = compile(source, { generate: 'server', filename: 'ArticleCard.svelte' });
  const dependencies = {
    '$lib/utils/images.js': 'data:text/javascript,export const createSanityImageSet = () => ({src:"/logo.svg"})',
    '$lib/utils/publishedDate.js': new URL('../src/lib/utils/publishedDate.js', import.meta.url).href,
    '$lib/utils/quizLinks.js': new URL('../src/lib/utils/quizLinks.js', import.meta.url).href
  };
  const code = js.code.replace(/from ['"]([^'"]+)['"]/g, (_, specifier) =>
    `from '${dependencies[specifier] ?? import.meta.resolve(specifier)}'`
  );
  const { default: ArticleCard } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  const { body } = render(ArticleCard, {
    props: { quiz: { slug: 'sample', category: { slug: 'matchstick' }, title: '元のクイズタイトル', publishedAt: '2024-01-01T00:00:00Z' } }
  });
  assert.match(body, /<a [^>]*href="\/category\/matchstick\/sample"[^>]*>(?:(?!<\/a>)[\s\S])*?<img\b(?:(?!<\/a>)[\s\S])*?<h3[^>]*>元のクイズタイトル<\/h3>/);
  assert.match(body, /<\/a>[\s\S]*?<a [^>]*href="\/quiz\/sample\/answer"[^>]*>\s*答えを見る\s*<\/a>/);
  assert.doesNotMatch(body, /<a\b[^>]*>(?:(?!<\/a>)[\s\S])*?<a\b/);
});
