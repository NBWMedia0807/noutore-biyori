// scripts/backfill-publishedAt.mjs
// 公開済みの quiz ドキュメントで publishedAt が未設定のものに _createdAt を補完します。
// 必要な環境変数:
// - SANITY_PROJECT_ID
// - SANITY_DATASET (省略時: production)
// - SANITY_AUTH_TOKEN または書き込み権限のあるトークン

import { createClient } from '@sanity/client';

const projectId = process.env.SANITY_PROJECT_ID;
const dataset = process.env.SANITY_DATASET || 'production';
const token =
  process.env.SANITY_AUTH_TOKEN ||
  process.env.SANITY_WRITE_TOKEN ||
  process.env.SANITY_DEPLOY_TOKEN ||
  process.env.SANITY_API_TOKEN;

if (!projectId || !token) {
  console.error('Missing env: SANITY_PROJECT_ID と書き込み可能なトークンが必要です。');
  process.exit(1);
}

const isDryRun = process.argv.includes('--dry-run');

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  token,
  useCdn: false
});

const QUERY = `*[
  _type == "quiz" &&
  !(_id in path("drafts.**")) &&
  !defined(publishedAt)
]{ _id, _createdAt }`;

const toIsoString = (value) => {
  if (!value) return new Date().toISOString();
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return new Date().toISOString();
    }
    return date.toISOString();
  } catch (error) {
    console.warn('[backfill] invalid _createdAt detected', value, error);
    return new Date().toISOString();
  }
};

async function main() {
  console.log('=== Backfill quiz.publishedAt ===');
  console.log(`project: ${projectId}, dataset: ${dataset}`);
  console.log(`mode: ${isDryRun ? 'dry-run (更新なし)' : 'write'}`);

  const targets = await client.fetch(QUERY);
  const docs = Array.isArray(targets) ? targets.filter((doc) => doc?._id) : [];
  console.log(`対象ドキュメント: ${docs.length}件`);

  if (docs.length === 0) {
    console.log('更新は不要です。');
    return;
  }

  let success = 0;
  let skipped = 0;

  for (const doc of docs) {
    const fallback = toIsoString(doc?._createdAt);
    try {
      if (isDryRun) {
        success += 1;
        console.log(`[dry-run] ${doc._id} -> ${fallback}`);
        continue;
      }

      await client.patch(doc._id).set({ publishedAt: fallback }).commit();
      success += 1;
      console.log(`updated: ${doc._id} -> ${fallback}`);
    } catch (error) {
      skipped += 1;
      console.error(`failed: ${doc._id}`, error);
    }
  }

  if (isDryRun) {
    console.log(`dry-run完了: 対象 ${success}件 / エラー ${skipped}件`);
  } else {
    console.log(`更新完了: ${success}件 / 失敗 ${skipped}件`);
  }
}

main().catch((error) => {
  console.error('[backfill] unexpected error', error);
  process.exit(1);
});
