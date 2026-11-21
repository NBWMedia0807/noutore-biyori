// 試験 Worker 専用。
// ads.txt や画像は Cloudflare の静的アセットとして配信され、Worker の fetch を通らない。
// そのため _headers で noindex と HSTS を付ける。この Worker は noutore-biyori-staging だけ。
// 本番 Worker のビルドではこのスクリプトを実行しない。
//
//   node scripts/append-staging-asset-headers.mjs

import fs from 'node:fs';

const file = new URL('../.svelte-kit/cloudflare/_headers', import.meta.url);
const marker = '# staging-workers-dev-headers';
const block = `${marker}
/*
  X-Robots-Tag: noindex
  Strict-Transport-Security: max-age=63072000
`;

const current = fs.readFileSync(file, 'utf8');
if (current.includes(marker)) {
  console.log('[staging-headers] already present');
  process.exit(0);
}

const next = current.endsWith('\n') ? current + block : `${current}\n${block}`;
fs.writeFileSync(file, next);
console.log('[staging-headers] appended noindex and HSTS for static assets');
