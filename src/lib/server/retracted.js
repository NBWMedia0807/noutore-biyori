/**
 * 是正対象として非公開化された記事に 410 Gone を返すためのヘルパー。
 *
 * 404（Not Found）ではなく 410（Gone）を返す理由:
 * 404 は「一時的に見つからない」とも解釈されるためクローラは再訪を続けるが、
 * 410 は「恒久的に削除された」という明示的なシグナルで、Google / SmartNews とも
 * インデックスからの除去が速く、再クロールも止まる。
 * 是正対象の記事を配信先の目に触れさせないことが目的なので 410 を使う。
 */

import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity.server.js';
import { QUIZ_RETRACTED_LOOKUP } from '$lib/queries/quizVisibility.js';

/**
 * 公開クエリが 0 件だったスラッグについて、非公開化されたものか単に存在しないのかを判定し、
 * 前者なら 410、後者なら 404 を投げる。**必ず例外を投げて戻らない。**
 *
 * @param {string} slug 記事スラッグ（slug.current）
 * @returns {Promise<never>}
 */
export async function throwGoneOrNotFound(slug) {
  let retracted = null;
  try {
    retracted = await client.fetch(QUIZ_RETRACTED_LOOKUP, { slug });
  } catch (err) {
    // 判定用クエリの失敗で 503 にはしない。通常の 404 として扱う。
    console.error('[retracted] lookup failed:', err);
  }

  if (retracted?._id) {
    throw error(410, 'この記事は内容の見直しのため公開を終了しました。');
  }

  throw error(404, `Quiz not found: ${slug}`);
}
