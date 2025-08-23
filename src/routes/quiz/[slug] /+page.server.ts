// src/routes/quiz/[slug]/+page.server.ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

// ★ 共通クライアントを使う（トップページと同じ import に揃える）
import { client } from '$lib/sanity.js';   // ← ここがポイント

export const prerender = false; // SSR強制（動的URLは必ずサーバーで処理）

// 型条件を外して slug だけで探し、まずは確実にヒットさせる
const QUERY = `*[defined(slug.current) && slug.current==$slug][0]{
  _id,_type,title,slug,body,mainImage{asset->{url,metadata}}
}`;

export const load: PageServerLoad = async ({ params }) => {
  const quiz = await client.fetch(QUERY, { slug: params.slug });
  if (!quiz) {
    console.log('slug not found:', params.slug);
    throw error(404, 'Not found');
  }
  return { quiz };
};