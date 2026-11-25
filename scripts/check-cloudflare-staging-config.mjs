// wrangler.jsonc が試験用のままかを確認する。
// 本番の Worker 名・routes・custom domain が混ざっていたら終了コード 1。
//
//   node scripts/check-cloudflare-staging-config.mjs

import fs from 'node:fs';

const STAGING_WORKER_NAME = 'noutore-biyori-staging';
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

if (config.name !== STAGING_WORKER_NAME) {
  errors.push(`name は ${STAGING_WORKER_NAME} だけにしてください（今: ${config.name ?? 'なし'}）`);
}

if (config.workers_dev === false) {
  errors.push('workers_dev を false にしないでください（試験は *.workers.dev のみ）');
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
  errors.push(`routes / custom domain は試験フェーズでは置けません: ${forbidden.join(', ')}`);
}

if (config.env && Object.prototype.hasOwnProperty.call(config.env, 'production')) {
  errors.push('env.production は切替用の別変更まで置かないでください');
}

if (errors.length > 0) {
  console.error('[cloudflare-staging] wrangler.jsonc が試験用ではありません');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`[cloudflare-staging] ok: ${config.name}（workers.dev のみ、routes なし）`);
