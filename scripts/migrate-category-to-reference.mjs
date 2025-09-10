// scripts/migrate-category-to-reference.mjs
// 既存の quiz.category (string) を category (reference) に移行します。
// 必要な環境変数:
// - SANITY_PROJECT_ID
// - SANITY_DATASET (default: production)
// - SANITY_AUTH_TOKEN (Write token)

import { createClient } from '@sanity/client';

const projectId = process.env.SANITY_PROJECT_ID;
const dataset = process.env.SANITY_DATASET || 'production';
const token = process.env.SANITY_AUTH_TOKEN;

if (!projectId || !token) {
  console.error('Missing env: SANITY_PROJECT_ID and/or SANITY_AUTH_TOKEN');
  process.exit(1);
}

const client = createClient({ projectId, dataset, apiVersion: '2024-01-01', token, useCdn: false });

async function ensureCategory(title) {
  // 既存のカテゴリをタイトルで検索
  const existing = await client.fetch(
    '*[_type=="category" && title==$t][0]{_id,title}',
    { t: title }
  );
  if (existing?._id) return existing._id;

  const id = `category-${Buffer.from(title).toString('hex').slice(0, 24)}`;
  const created = await client.createIfNotExists({
    _id: id,
    _type: 'category',
    title
  });
  return created._id;
}

async function main() {
  console.log('=== Migrate quiz.category(string) -> reference ===');

  // 文字列 category を持つクイズを抽出（reference未定義、categoryは定義済み）
  const rows = await client.fetch(
    '*[_type=="quiz" && defined(category) && !defined(category._ref)]{_id, title, category}'
  );
  console.log(`対象ドキュメント数: ${rows.length}`);
  if (!rows.length) return;

  // タイトルのユニーク集合を作成
  const titles = [...new Set(rows.map(r => String(r.category).trim()).filter(Boolean))];
  console.log('カテゴリ候補:', titles);

  // カテゴリを用意
  const titleToId = {};
  for (const t of titles) {
    titleToId[t] = await ensureCategory(t);
  }

  // パッチ適用
  let ok = 0;
  for (const r of rows) {
    const t = String(r.category).trim();
    const refId = titleToId[t];
    if (!refId) {
      console.warn(`カテゴリ未解決: ${r._id} (${t})`);
      continue;
    }
    await client
      .patch(r._id)
      .set({ category: { _type: 'reference', _ref: refId } })
      .commit();
    ok++;
  }
  console.log(`移行完了: ${ok}/${rows.length} 件更新`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

