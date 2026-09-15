// tests/helpers/kit-alias-loader.mjs
//
// SvelteKit の `$lib/...` エイリアスを Node の ESM ローダーで解決するためのフック。
// これがあると SvelteKit を起動しなくても `src/routes/feed/smartnews/+server.js` を
// そのまま import して、実際に配信される XML を組み立てて検証できる。
//
// Sanity への通信が必要な2モジュール（sanity.server.js / sanity/client.js）だけは
// tests/helpers/stubs/ の差し替え版へ向ける。フィードの組み立てロジック本体には
// 一切手を入れないので、テストで得られる XML は本番と同じ経路で生成されたもの。
//
// 使い方: node --import ./tests/helpers/register-kit-alias.mjs --test tests/xxx.test.mjs

import { existsSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url);

/** Sanity に触れるモジュールだけスタブへ差し替える */
const STUBS = new Map([
  ['$lib/sanity.server.js', new URL('tests/helpers/stubs/sanity-server.mjs', ROOT).href],
  ['$lib/sanity/client', new URL('tests/helpers/stubs/sanity-client.mjs', ROOT).href],
  ['$lib/sanity/client.js', new URL('tests/helpers/stubs/sanity-client.mjs', ROOT).href],
]);

const resolveLibPath = (specifier) => {
  const relative = specifier.slice('$lib/'.length);
  const base = new URL(`src/lib/${relative}`, ROOT);
  const candidates = [base, new URL(`${base.href}.js`), new URL(`${base.href}/index.js`)];
  return candidates.find((candidate) => existsSync(candidate))?.href;
};

export async function resolve(specifier, context, next) {
  const stub = STUBS.get(specifier);
  if (stub) return { url: stub, shortCircuit: true };

  if (specifier.startsWith('$lib/')) {
    const url = resolveLibPath(specifier);
    if (url) return { url, shortCircuit: true };
  }

  return next(specifier, context);
}
