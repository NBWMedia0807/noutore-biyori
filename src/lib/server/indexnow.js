/**
 * IndexNow 通知ユーティリティ（サーバーサイド専用）
 *
 * 必要な環境変数:
 *   INDEXNOW_KEY  - IndexNow キー文字列（8〜128文字の英数字・ハイフン・アンダースコア）
 *
 * キーファイル:
 *   static/{INDEXNOW_KEY}.txt の内容にキー文字列だけを記述してください。
 *
 * バースト時は URL を 1 リクエストにまとめ、同じ URL は時間窓のあいだ再送しない。
 * 429 のときは Retry-After のあいだ送り直さず、呼び出し元には失敗を返さない。
 * 400/403/422 のときは 1 件ずつ送り直し、それでも拒否された URL だけ捨てる。
 */

import { env } from '$env/dynamic/private';
import { SITE } from '$lib/config/site.js';
import { buildIndexNowRequestBody, createIndexNowScheduler } from '$lib/server/indexnow-queue.js';

const INDEXNOW_API = 'https://api.indexnow.org/indexnow';
const scheduler = createIndexNowScheduler();

const validUrls = (urls) => {
  const list = Array.isArray(urls) ? urls : [];
  return list.filter((url) => typeof url === 'string' && url.startsWith('https://'));
};

export const postIndexNow = async (urls, { key, fetchImpl = fetch, signal } = {}) => {
  const body = buildIndexNowRequestBody({ urls, key, siteUrl: SITE.url });

  const response = await fetchImpl(INDEXNOW_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
    signal,
  });

  if (response.ok || response.status === 202) {
    return { ok: true, status: response.status };
  }

  const retryAfter = response.headers?.get?.('retry-after') ?? null;
  const text = await response.text?.().catch?.(() => '');
  return {
    ok: false,
    status: response.status,
    error: typeof text === 'string' ? text.slice(0, 500) : '',
    retryAfter,
  };
};

/**
 * IndexNow API に URL を通知する。
 * 429 や通信失敗でも ok: true（skipped / throttled）を返し、webhook を失敗させない。
 * waitUntil があるときは応答を待たずに裏で送る。
 * @param {string[]} urls
 * @param {{ waitUntil?: Function, key?: string, fetchImpl?: typeof fetch, scheduler?: ReturnType<typeof createIndexNowScheduler> }} [options]
 */
export const notifyIndexNow = async (urls, options = {}) => {
  const key = options.key ?? env.INDEXNOW_KEY;
  if (!key) {
    console.warn('[indexnow] INDEXNOW_KEY is not configured. Skipping IndexNow notification.');
    return { ok: false, error: 'INDEXNOW_KEY not configured' };
  }

  const urlsToSend = validUrls(urls);
  if (urlsToSend.length === 0) {
    return { ok: false, error: 'No valid URLs to submit' };
  }

  const queue = options.scheduler ?? scheduler;
  const { accepted, deduped } = queue.enqueue(urlsToSend);
  if (accepted.length === 0 && queue.pendingCount() === 0) {
    return { ok: true, skipped: true, reason: 'deduped', submitted: 0, deduped: deduped.length };
  }

  const submit = (batch, { signal } = {}) =>
    postIndexNow(batch, { key, fetchImpl: options.fetchImpl ?? fetch, signal });
  try {
    const task = queue.kick(submit, options.waitUntil);
    if (typeof options.waitUntil === 'function') {
      return { ok: true, deferred: true, queued: accepted.length, deduped: deduped.length };
    }
    const result = await task;
    return { ...result, deduped: deduped.length };
  } catch (error) {
    console.error('[indexnow] unexpected failure', error);
    return { ok: true, skipped: true, reason: 'error' };
  }
};
