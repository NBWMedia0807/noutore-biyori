// scripts/backfill-difficulty.mjs
// difficulty が未設定の公開済み quiz ドキュメントに "normal" を一括セットします。
//
// 必要な環境変数:
//   SANITY_PROJECT_ID   : Sanity プロジェクト ID
//   SANITY_DATASET      : データセット名（省略時: production）
//   SANITY_AUTH_TOKEN   : 書き込み権限のある API トークン
//                         (SANITY_WRITE_TOKEN / SANITY_DEPLOY_TOKEN / SANITY_API_TOKEN も代替可)
//
// 実行方法:
//   node scripts/backfill-difficulty.mjs
//
// dry-run（変更せず確認のみ）:
//   DRY_RUN=1 node scripts/backfill-difficulty.mjs

import { createClient } from '@sanity/client';

const projectId = process.env.SANITY_PROJECT_ID;
const dataset = process.env.SANITY_DATASET || 'production';
const token =
  process.env.SANITY_AUTH_TOKEN ||
  process.env.SANITY_WRITE_TOKEN ||
  process.env.SANITY_DEPLOY_TOKEN ||
  process.env.SANITY_API_TOKEN;
const isDryRun = process.env.DRY_RUN === '1';

if (!projectId || !token) {
  console.error('Missing env: SANITY_PROJECT_ID と書き込み可能なトークンが必要です。');
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  token,
  useCdn: false
});

// difficulty が未設定の公開済み quiz（ドラフト除く）を全件取得
const QUERY = `*[
  _type == "quiz" &&
  !(_id in path("drafts.**")) &&
  !defined(difficulty)
]{ _id, title, "slug": slug.current }`;

async function main() {
  console.log('=== Backfill quiz.difficulty → "normal" ===');
  console.log(`project: ${projectId}, dataset: ${dataset}`);
  if (isDryRun) console.log('[DRY RUN] 実際の書き込みは行いません\n');

  const targets = await client.fetch(QUERY);
  const docs = Array.isArray(targets) ? targets.filter((doc) => doc?._id) : [];
  console.log(`対象ドキュメント: ${docs.length}件\n`);

  if (docs.length === 0) {
    console.log('更新は不要です。');
    return;
  }

  let success = 0;
  let failed = 0;

  for (const doc of docs) {
    const label = `${doc._id} (${doc.slug ?? doc.title ?? '?'})`;
    if (isDryRun) {
      console.log(`[dry-run] would update: ${label}`);
      success += 1;
      continue;
    }
    try {
      await client.patch(doc._id).set({ difficulty: 'normal' }).commit();
      success += 1;
      console.log(`updated: ${label}`);
    } catch (error) {
      failed += 1;
      console.error(`failed:  ${label}`, error.message);
    }
  }

  console.log(`\n更新完了: ${success}件 / 失敗: ${failed}件`);
}

main().catch((error) => {
  console.error('[backfill-difficulty] unexpected error', error);
  process.exit(1);
});
