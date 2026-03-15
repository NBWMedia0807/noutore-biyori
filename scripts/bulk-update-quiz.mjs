// scripts/bulk-update-quiz.mjs
// author と imageType が未設定の quiz ドキュメントに一括で初期値をセットします。
//
// 必要な環境変数:
//   SANITY_PROJECT_ID   : Sanity プロジェクト ID
//   SANITY_DATASET      : データセット名（省略時: production）
//   SANITY_AUTH_TOKEN   : 書き込み権限のある API トークン
//                         (SANITY_WRITE_TOKEN / SANITY_DEPLOY_TOKEN / SANITY_API_TOKEN も代替可)
//
// 実行方法:
//   node scripts/bulk-update-quiz.mjs

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

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  token,
  useCdn: false
});

// slug が 'editorial-team' の著者ドキュメントの _id を取得
async function fetchEditorialTeamId() {
  const author = await client.fetch(
    `*[_type == "author" && slug.current == "editorial-team"][0]{_id}`
  );
  if (!author?._id) {
    throw new Error('著者 "editorial-team" が見つかりません。先に著者ドキュメントを作成してください。');
  }
  return author._id;
}

// author または imageType が未設定の公開済み quiz を取得
const QUERY = `*[
  _type == "quiz" &&
  !(_id in path("drafts.**")) &&
  (!defined(author) || !defined(imageType))
]{ _id, "hasAuthor": defined(author), "hasImageType": defined(imageType) }`;

async function main() {
  console.log('=== Bulk update quiz: author / imageType ===');
  console.log(`project: ${projectId}, dataset: ${dataset}`);

  const authorId = await fetchEditorialTeamId();
  console.log(`著者 "editorial-team" _id: ${authorId}`);

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
    const patch = {};

    if (!doc.hasAuthor) {
      patch.author = { _type: 'reference', _ref: authorId };
    }
    if (!doc.hasImageType) {
      patch.imageType = 'original';
    }

    try {
      await client.patch(doc._id).set(patch).commit();
      success += 1;
      const fields = Object.keys(patch).join(', ');
      console.log(`updated: ${doc._id} (${fields})`);
    } catch (error) {
      skipped += 1;
      console.error(`failed: ${doc._id}`, error.message);
    }
  }

  console.log(`\n更新完了: ${success}件 / 失敗: ${skipped}件`);
}

main().catch((error) => {
  console.error('[bulk-update-quiz] unexpected error', error);
  process.exit(1);
});
