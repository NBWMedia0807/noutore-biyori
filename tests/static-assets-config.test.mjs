// tests/static-assets-config.test.mjs
//
// wrangler.jsonc の assets.run_worker_first の否定（!/...）が、static/ に実在するファイルだけを
// 指しているかを確認する。否定に一致したパスは Worker を通らず静的配信されるため、
// 広いワイルドカード（!/*.png など）や存在しないパスを書くと、ローカルで Worker への
// フォールスルーが壊れる・本来 Worker が返すべき 404 が変わる。
//
//   node --test tests/static-assets-config.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ROOT = new URL('../', import.meta.url);

// 文字列の外にある // と /* */ コメントだけを取り除く（"/*" などの文字列は残す）
const stripJsonc = (input) => {
  let out = '';
  let inString = false;
  for (let i = 0; i < input.length; i += 1) {
    const c = input[i];
    if (inString) {
      out += c;
      if (c === '\\') {
        out += input[i + 1] ?? '';
        i += 1;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
    } else if (c === '/' && input[i + 1] === '/') {
      while (i < input.length && input[i] !== '\n') i += 1;
      out += '\n';
    } else if (c === '/' && input[i + 1] === '*') {
      i += 2;
      while (i < input.length && !(input[i] === '*' && input[i + 1] === '/')) i += 1;
      i += 1;
    } else {
      out += c;
    }
  }
  return out;
};

const config = JSON.parse(stripJsonc(fs.readFileSync(new URL('wrangler.jsonc', ROOT), 'utf8')));
const rules = config.assets.run_worker_first;
// アダプターが生成する /_app 配下は static/ に無いので別扱い
const GENERATED = new Set(['!/_app/immutable/*', '!/_app/version.json']);
const staticNegations = rules.filter((rule) => rule.startsWith('!') && !GENERATED.has(rule));

test('先頭は /* で、それ以外は否定ルール', () => {
  assert.equal(rules[0], '/*');
  for (const rule of rules.slice(1)) assert.ok(rule.startsWith('!/'), rule);
});

test('static/ 用の否定はワイルドカードを使わず、実在ファイルだけを指す', () => {
  for (const rule of staticNegations) {
    assert.ok(!/[*?]/.test(rule), `ワイルドカードは使わない: ${rule}`);
    const file = new URL(`static${rule.slice(1)}`, ROOT);
    assert.ok(fs.existsSync(file) && fs.statSync(file).isFile(), `static に無い: ${rule}`);
  }
});

test('favicon.ico と apple-touch-icon は Worker を通さず静的配信する', () => {
  for (const path of [
    '/favicon.ico',
    '/apple-touch-icon.png',
    '/apple-touch-icon-precomposed.png',
  ]) {
    assert.ok(rules.includes(`!${path}`), `run_worker_first に !${path} が無い`);
  }
});

test('app.html が favicon.ico と apple-touch-icon を指す', () => {
  const html = fs.readFileSync(new URL('src/app.html', ROOT), 'utf8');
  assert.match(html, /<link rel="icon" href="\/favicon\.ico"/);
  assert.match(html, /<link rel="apple-touch-icon" href="\/apple-touch-icon\.png"/);
});
