// wrangler.jsonc が本番 Worker 用で、ドメイン未割り当てのままかを確認する。
// routes / custom domain / 試験用の静的 noindex 追記があれば終了コード 1。
//
//   node scripts/check-cloudflare-production-config.mjs

import fs from 'node:fs';

const PRODUCTION_WORKER_NAME = 'noutore-biyori';
const file = new URL('../wrangler.jsonc', import.meta.url);

const stripJsonc = (input) => {
  let out = '';
  let i = 0;
  let inString = false;
  let quote = '';
  while (i < input.length) {
    const c = input[i];
    const next = input[i + 1];
    if (inString) {
      out += c;
      if (c === '\\') {
        out += input[i + 1] ?? '';
        i += 2;
        continue;
      }
      if (c === quote) inString = false;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'") {
      inString = true;
      quote = c;
      out += c;
      i += 1;
      continue;
    }
    if (c === '/' && next === '/') {
      i += 2;
      while (i < input.length && input[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < input.length && !(input[i] === '*' && input[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
};

const raw = fs.readFileSync(file, 'utf8');
const config = JSON.parse(stripJsonc(raw));
const errors = [];

if (config.name !== PRODUCTION_WORKER_NAME) {
  errors.push(`name は ${PRODUCTION_WORKER_NAME} にしてください（今: ${config.name ?? 'なし'}）`);
}

if (config.workers_dev === false) {
  errors.push('workers_dev を false にしないでください（ドメイン割り当て前は *.workers.dev のみ）');
}

const forbidden = [];
const visit = (value, path) => {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => visit(item, `${path}[${index}]`));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const next = path ? `${path}.${key}` : key;
    if (key === 'routes' || key === 'route' || key === 'custom_domain' || key === 'custom_domains') {
      forbidden.push(next);
    }
    visit(child, next);
  }
};
visit(config, '');

if (forbidden.length > 0) {
  errors.push(`routes / custom domain はまだ置けません: ${forbidden.join(', ')}`);
}

const headersPath = new URL('../.svelte-kit/cloudflare/_headers', import.meta.url);
if (fs.existsSync(headersPath)) {
  const headers = fs.readFileSync(headersPath, 'utf8');
  if (headers.includes('staging-workers-dev-headers')) {
    errors.push('試験用の _headers（全静的ファイル noindex）が本番ビルドに入っています');
  }
}

if (errors.length > 0) {
  console.error('[cloudflare-production] wrangler.jsonc が本番の未割り当て設定ではありません');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`[cloudflare-production] ok: ${config.name}（workers.dev のみ、routes なし）`);
