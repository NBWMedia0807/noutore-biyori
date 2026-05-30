#!/usr/bin/env node
// scripts/check-duplicate-slugs.mjs
//
// クイズの「スラッグ重複」を監視するチェック。
// SmartNews 指摘②（item.link の URL と記事内容が一致しない／遷移先がエラー）の
// 根本原因＝重複スラッグが、スクリプト/API 経由で再発していないかを検出する。
//
// 判定:
//   - 空スラッグ                         → ❌ エラー（リンクが壊れる）
//   - 別内容が同一スラッグを共有(Type B) → ❌ エラー（item.link 不一致の原因）
//   - 同一タイトルの重複コピー(Type A)   → ⚠️ 警告のみ（同一内容なので致命的ではない）
//
// 読み取りトークンや projectId/dataset が未設定の場合、またはネットワーク失敗時は
// （CI 等でビルドを止めないよう）スキップして exit 0 とする。

import { createClient } from '@sanity/client';

const PREFIX = '[check:slugs]';

const projectId = process.env.SANITY_PROJECT_ID;
const dataset = process.env.SANITY_DATASET;
const apiVersion = process.env.SANITY_API_VERSION || '2024-01-01';
// 読み取り・書き込みいずれのトークンでもクエリ可能。
// 重複を作り得るアップロード経路（sanity_upload.mjs=SANITY_WRITE_TOKEN /
// pipeline.py=SANITY_TOKEN 等）の認証情報しか無い環境でも検知できるよう、
// 書き込み用トークン名も候補に含める。
const token =
  process.env.SANITY_READ_TOKEN ||
  process.env.SANITY_WRITE_TOKEN ||
  process.env.SANITY_AUTH_TOKEN ||
  process.env.SANITY_DEPLOY_TOKEN ||
  process.env.SANITY_API_TOKEN ||
  process.env.SANITY_TOKEN;

if (!projectId || !dataset) {
  console.warn(`${PREFIX} ⚠️ SANITY_PROJECT_ID / SANITY_DATASET 未設定のためスキップします。`);
  process.exit(0);
}
if (!token) {
  console.warn(`${PREFIX} ⚠️ 読み取りトークン未設定のためスキップします。`);
  process.exit(0);
}

const client = createClient({ projectId, dataset, apiVersion, useCdn: false, token });

// 公開済みクイズのうち、スラッグが設定されているもの
const SLUG_QUERY = /* groq */ `*[
  _type == "quiz" &&
  !(_id in path("drafts.**")) &&
  defined(slug.current) &&
  slug.current != ""
]{ _id, title, "slug": slug.current } | order(slug asc)`;

// 空スラッグ（未設定 or 空文字）のクイズ
const EMPTY_QUERY = /* groq */ `*[
  _type == "quiz" &&
  !(_id in path("drafts.**")) &&
  (!defined(slug.current) || slug.current == "")
]{ _id, title }`;

let docs;
let emptySlugDocs;
try {
  [docs, emptySlugDocs] = await Promise.all([client.fetch(SLUG_QUERY), client.fetch(EMPTY_QUERY)]);
} catch (error) {
  // ネットワーク等の失敗ではビルドを止めない（監視目的）。
  console.warn(`${PREFIX} ⚠️ チェック実行に失敗したためスキップします: ${error.message}`);
  process.exit(0);
}

// スラッグごとにグルーピング
const bySlug = new Map();
for (const doc of docs) {
  if (!bySlug.has(doc.slug)) bySlug.set(doc.slug, []);
  bySlug.get(doc.slug).push(doc);
}

const typeBCollisions = []; // 別内容（タイトル相違）が同一スラッグ
const typeADuplicates = []; // 同一タイトルの重複コピー

for (const [slug, group] of bySlug) {
  if (group.length < 2) continue;
  const uniqueTitles = new Set(group.map((d) => d.title));
  if (uniqueTitles.size > 1) {
    typeBCollisions.push({ slug, docs: group });
  } else {
    typeADuplicates.push({ slug, docs: group });
  }
}

let hasError = false;

if (emptySlugDocs.length > 0) {
  hasError = true;
  console.error(`${PREFIX} ❌ 空スラッグの記事が ${emptySlugDocs.length} 件あります（リンクが壊れます）:`);
  for (const d of emptySlugDocs) console.error(`      - ${d._id} : ${d.title}`);
}

if (typeBCollisions.length > 0) {
  hasError = true;
  console.error(
    `${PREFIX} ❌ 別内容の記事が同一スラッグを共有しています（SmartNews item.link 不一致の原因） ${typeBCollisions.length} 件:`
  );
  for (const c of typeBCollisions) {
    console.error(`      slug: ${c.slug}`);
    for (const d of c.docs) console.error(`        - ${d._id} : ${d.title}`);
  }
}

if (typeADuplicates.length > 0) {
  console.warn(
    `${PREFIX} ⚠️ 同一タイトルの重複コピーが ${typeADuplicates.length} 件あります（同一内容のため非致命的・整理推奨）:`
  );
  for (const c of typeADuplicates) {
    console.warn(`      slug: ${c.slug} (${c.docs.length}件) : ${c.docs[0].title}`);
  }
}

if (hasError) {
  console.error(
    `${PREFIX} 重複スラッグの修正が必要です。docs/smartnews-duplicate-slug-fix.md を参照してください。`
  );
  process.exit(1);
}

console.info(
  typeADuplicates.length === 0
    ? `${PREFIX} ✅ スラッグの重複・空スラッグはありません。`
    : `${PREFIX} ✅ 致命的な重複（別内容の衝突・空スラッグ）はありません。`
);
