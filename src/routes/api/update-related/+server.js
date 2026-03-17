// src/routes/api/update-related/+server.js
// Sanity webhook を受け取り、全 quiz の relatedArticles を同カテゴリ最新 5 件で上書きします。
//
// Sanity webhook 設定:
//   URL    : https://noutorebiyori.com/api/update-related?secret=<SANITY_REVALIDATE_SECRET>
//   Filter : _type == "quiz"
//   Trigger: publish (Create / Update)
//
// 必要な環境変数:
//   SANITY_REVALIDATE_SECRET または VERCEL_REVALIDATE_TOKEN : webhook 認証シークレット
//   SANITY_WRITE_TOKEN / SANITY_AUTH_TOKEN : 書き込み権限のあるトークン
//   SANITY_PROJECT_ID, SANITY_DATASET, SANITY_API_VERSION

import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createClient } from '@sanity/client';

const WEBHOOK_SECRET = env.SANITY_REVALIDATE_SECRET || env.VERCEL_REVALIDATE_TOKEN || '';

// 全公開済み quiz を publishedAt 降順で取得（再公開記事を除外）
const ALL_QUIZ_QUERY = /* groq */ `*[
  _type == "quiz" &&
  !(_id in path("drafts.**")) &&
  isRepublished != true
] | order(publishedAt desc) {
  _id,
  "slug": slug.current,
  "categoryRef": category._ref
}`;

// スラッグの先頭セグメントをカテゴリキーとして返す
// 例: "matchstick-quiz/article/336" → "matchstick-quiz"
function slugPrefix(slug) {
  if (typeof slug !== 'string' || !slug) return null;
  return slug.split('/')[0] || null;
}

// カテゴリキー → quiz リスト のマップを構築
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

// 同カテゴリ・自分以外・最新 5 件を reference 配列で返す（順序は GROQ の order に依存）
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

// Sanity transaction で全件バッチ更新
async function runBulkUpdate(writeClient) {
  const allDocs = await writeClient.fetch(ALL_QUIZ_QUERY);
  const docs = Array.isArray(allDocs) ? allDocs.filter((d) => d?._id) : [];

  if (docs.length === 0) {
    return { updated: 0, skipped: 0, total: 0 };
  }

  const categoryMap = buildCategoryMap(docs);
  let tx = writeClient.transaction();
  let updated = 0;
  let skipped = 0;

  for (const doc of docs) {
    const related = pickRelated(doc, categoryMap);
    if (!related) {
      skipped++;
      continue;
    }
    tx = tx.patch(doc._id, (p) => p.set({ relatedArticles: related }));
    updated++;
  }

  if (updated > 0) {
    await tx.commit();
  }

  return { updated, skipped, total: docs.length };
}

export const POST = async (event) => {
  // ── 認証チェック ───────────────────────────────────────────────
  if (!WEBHOOK_SECRET) {
    console.error('[update-related] SANITY_REVALIDATE_SECRET が設定されていません。');
    return json({ ok: false, message: 'Server misconfiguration' }, { status: 500 });
  }

  const providedSecret =
    event.url.searchParams.get('secret') ||
    event.request.headers.get('x-sanity-webhook-secret');

  if (!providedSecret || providedSecret !== WEBHOOK_SECRET) {
    return json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  // ── ペイロード解析 ────────────────────────────────────────────
  let payload;
  try {
    payload = await event.request.json();
  } catch {
    return json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
  }

  // quiz 以外のドキュメントはスキップ
  const docType =
    payload?._type ||
    payload?.document?._type ||
    payload?.after?._type;
  if (docType && docType !== 'quiz') {
    return json({ ok: true, message: `Skipped: _type=${docType}` });
  }

  // ── 書き込みクライアント構築 ──────────────────────────────────
  const writeToken =
    env.SANITY_WRITE_TOKEN ||
    env.SANITY_AUTH_TOKEN ||
    env.SANITY_DEPLOY_TOKEN ||
    env.SANITY_API_TOKEN;

  if (!writeToken) {
    console.error('[update-related] 書き込みトークンが設定されていません。');
    return json({ ok: false, message: 'Write token not configured' }, { status: 500 });
  }

  const writeClient = createClient({
    projectId: env.SANITY_PROJECT_ID,
    dataset: env.SANITY_DATASET || 'production',
    apiVersion: env.SANITY_API_VERSION || '2024-01-01',
    token: writeToken,
    useCdn: false
  });

  // ── バッチ更新 ────────────────────────────────────────────────
  try {
    const result = await runBulkUpdate(writeClient);
    console.log('[update-related] completed', result);
    return json({ ok: true, ...result });
  } catch (error) {
    console.error('[update-related] failed', error);
    return json({ ok: false, message: error.message }, { status: 500 });
  }
};

export const GET = () => json({ ok: false, message: 'Method Not Allowed' }, { status: 405 });
