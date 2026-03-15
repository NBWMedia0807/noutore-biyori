// scripts/bulk-update-quiz.mjs
// 以下のフィールドが未設定の quiz ドキュメントに一括で初期値をセットします。
//   - author     : slug "editorial-team" の著者ドキュメントへの参照
//   - imageType  : "original"
//   - relatedArticles : 同カテゴリの他のクイズから最新 5 件
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

// スラッグの先頭セグメントをカテゴリキーとして返す
// 例: "matchstick-quiz/article/336" → "matchstick-quiz"
function slugPrefix(slug) {
  if (typeof slug !== 'string' || !slug) return null;
  return slug.split('/')[0] || null;
}

// 全公開済み quiz を取得（relatedArticles 判定・カテゴリグループ化に使用）
const ALL_QUIZ_QUERY = `*[
  _type == "quiz" &&
  !(_id in path("drafts.**"))
] | order(publishedAt desc) {
  _id,
  "slug": slug.current,
  "categoryRef": category._ref,
  "hasAuthor": defined(author),
  "hasImageType": defined(imageType),
  "hasRelatedArticles": defined(relatedArticles) && count(relatedArticles) > 0,
  publishedAt
}`;

// カテゴリキー → 公開日降順の _id リスト のマップを構築
// カテゴリキーは categoryRef を優先し、未設定時はスラッグプレフィックスで代替
function buildCategoryMap(docs) {
  const map = new Map(); // key: categoryRef or slugPrefix → [{ _id, publishedAt }]

  for (const doc of docs) {
    const key = doc.categoryRef || slugPrefix(doc.slug);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(doc);
  }

  // 各グループをすでに publishedAt desc でソート済み（GROQ で order 済み）
  return map;
}

// 対象 doc のカテゴリキーを取得
function categoryKeyOf(doc) {
  return doc.categoryRef || slugPrefix(doc.slug);
}

// 同カテゴリの他クイズから最新 5 件の _id を返す
function pickRelated(doc, categoryMap) {
  const key = categoryKeyOf(doc);
  if (!key) return null;

  const group = categoryMap.get(key) ?? [];
  const related = group
    .filter((d) => d._id !== doc._id)
    .slice(0, 5);

  if (related.length === 0) return null;

  return related.map((d, i) => ({
    _type: 'reference',
    _ref: d._id,
    _key: `related-${i}`
  }));
}

async function main() {
  console.log('=== Bulk update quiz: author / imageType / relatedArticles ===');
  console.log(`project: ${projectId}, dataset: ${dataset}`);

  const authorId = await fetchEditorialTeamId();
  console.log(`著者 "editorial-team" _id: ${authorId}`);

  const allDocs = await client.fetch(ALL_QUIZ_QUERY);
  const docs = Array.isArray(allDocs) ? allDocs.filter((d) => d?._id) : [];
  console.log(`全クイズ数: ${docs.length}件`);

  const categoryMap = buildCategoryMap(docs);
  console.log(`カテゴリ数: ${categoryMap.size}件`);

  const targets = docs.filter(
    (d) => !d.hasAuthor || !d.hasImageType || !d.hasRelatedArticles
  );
  console.log(`更新対象: ${targets.length}件\n`);

  if (targets.length === 0) {
    console.log('更新は不要です。');
    return;
  }

  let success = 0;
  let skipped = 0;

  for (const doc of targets) {
    const patch = {};

    if (!doc.hasAuthor) {
      patch.author = { _type: 'reference', _ref: authorId };
    }
    if (!doc.hasImageType) {
      patch.imageType = 'original';
    }
    if (!doc.hasRelatedArticles) {
      const related = pickRelated(doc, categoryMap);
      if (related) {
        patch.relatedArticles = related;
      } else {
        console.warn(`  skip relatedArticles: ${doc._id} (同カテゴリの他クイズなし, key=${categoryKeyOf(doc)})`);
      }
    }

    if (Object.keys(patch).length === 0) continue;

    try {
      await client.patch(doc._id).set(patch).commit();
      success += 1;
      const fields = Object.keys(patch).join(', ');
      const slug = doc.slug ?? doc._id;
      console.log(`updated: ${slug} (${fields})`);
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
