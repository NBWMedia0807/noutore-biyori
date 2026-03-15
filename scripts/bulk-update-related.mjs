// scripts/bulk-update-related.mjs
// 全公開済み quiz の relatedArticles を同カテゴリ最新 5 件で上書きセットします。
//
// 必要な環境変数:
//   SANITY_PROJECT_ID   : Sanity プロジェクト ID
//   SANITY_DATASET      : データセット名（省略時: production）
//   SANITY_AUTH_TOKEN   : 書き込み権限のある API トークン
//                         (SANITY_WRITE_TOKEN / SANITY_DEPLOY_TOKEN / SANITY_API_TOKEN も代替可)
//
// 実行方法:
//   SANITY_PROJECT_ID=quljge22 SANITY_AUTH_TOKEN=xxx node scripts/bulk-update-related.mjs

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

// スラッグの先頭セグメントをカテゴリキーとして返す
// 例: "matchstick-quiz/article/336" → "matchstick-quiz"
function slugPrefix(slug) {
  if (typeof slug !== 'string' || !slug) return null;
  return slug.split('/')[0] || null;
}

// 全公開済み quiz を publishedAt 降順で取得
const ALL_QUIZ_QUERY = `*[
  _type == "quiz" &&
  !(_id in path("drafts.**"))
] | order(publishedAt desc) {
  _id,
  "slug": slug.current,
  "categoryRef": category._ref,
  publishedAt
}`;

// カテゴリキー → quiz リスト（publishedAt desc）のマップを構築
// categoryRef を優先し、未設定時はスラッグプレフィックスで代替
function buildCategoryMap(docs) {
  const map = new Map();
  for (const doc of docs) {
    const key = doc.categoryRef || slugPrefix(doc.slug);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(doc);
  }
  return map;
}

function categoryKeyOf(doc) {
  return doc.categoryRef || slugPrefix(doc.slug);
}

// 同カテゴリ・自分以外・最新 5 件を reference 配列で返す
function pickRelated(doc, categoryMap) {
  const key = categoryKeyOf(doc);
  if (!key) return null;
  const group = categoryMap.get(key) ?? [];
  const related = group.filter((d) => d._id !== doc._id).slice(0, 5);
  if (related.length === 0) return null;
  return related.map((d, i) => ({
    _type: 'reference',
    _ref: d._id,
    _key: `related-${i}`
  }));
}

async function main() {
  console.log('=== Bulk update relatedArticles (全件上書き) ===');
  console.log(`project: ${projectId}, dataset: ${dataset}`);

  const allDocs = await client.fetch(ALL_QUIZ_QUERY);
  const docs = Array.isArray(allDocs) ? allDocs.filter((d) => d?._id) : [];
  console.log(`全クイズ数: ${docs.length}件`);

  if (docs.length === 0) {
    console.log('ドキュメントが見つかりません。');
    return;
  }

  const categoryMap = buildCategoryMap(docs);
  console.log(`カテゴリ数: ${categoryMap.size}件\n`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of docs) {
    const related = pickRelated(doc, categoryMap);
    const slug = doc.slug ?? doc._id;

    if (!related) {
      skipped += 1;
      console.warn(`skip: ${slug} (同カテゴリの他クイズなし, key=${categoryKeyOf(doc)})`);
      continue;
    }

    try {
      await client.patch(doc._id).set({ relatedArticles: related }).commit();
      success += 1;
      console.log(`updated: ${slug} (${related.length}件)`);
    } catch (error) {
      failed += 1;
      console.error(`failed: ${slug}`, error.message);
    }
  }

  console.log(`\n更新完了: ${success}件 / スキップ: ${skipped}件 / 失敗: ${failed}件`);
}

main().catch((error) => {
  console.error('[bulk-update-related] unexpected error', error);
  process.exit(1);
});
