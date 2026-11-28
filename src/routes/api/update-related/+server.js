// src/routes/api/update-related/+server.js
// Sanity webhook を受け取り、公開された quiz と同じカテゴリの relatedArticles を更新する。
// 全件の書き換えは Worker の CPU 制限を超えるため、公開記事とカテゴリの先頭ウィンドウだけを、
// このリクエスト内で更新してから応答する。
//
// Sanity webhook 設定:
//   URL    : https://noutorebiyori.com/api/update-related?secret=<SANITY_REVALIDATE_SECRET>
//   Filter : _type == "quiz"
//   Trigger: publish (Create / Update)
//   Header : x-sanity-webhook-secret
//
// 必要な環境変数:
//   SANITY_REVALIDATE_SECRET または VERCEL_REVALIDATE_TOKEN : webhook 認証シークレット
//   SANITY_WRITE_TOKEN / SANITY_AUTH_TOKEN : 書き込み権限のあるトークン
//   SANITY_PROJECT_ID, SANITY_DATASET, SANITY_API_VERSION

import { env } from '$env/dynamic/private';
import { createClient } from '@sanity/client';
import { json } from '@sveltejs/kit';
import { handleUpdateRelatedPost } from '$lib/server/update-related.js';

export const POST = (event) => handleUpdateRelatedPost(event, { env, createClient });

export const GET = () => json({ ok: false, message: 'Method Not Allowed' }, { status: 405 });
