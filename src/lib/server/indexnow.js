/**
 * IndexNow 通知ユーティリティ（サーバーサイド専用）
 *
 * 必要な環境変数:
 *   INDEXNOW_KEY  - IndexNow キー文字列（8〜128文字の英数字・ハイフン・アンダースコア）
 *
 * キーファイル:
 *   static/{INDEXNOW_KEY}.txt の内容にキー文字列だけを記述してください。
 */

import { env } from '$env/dynamic/private';
import { SITE } from '$lib/config/site.js';

const INDEXNOW_API = 'https://api.indexnow.org/indexnow';

/**
 * IndexNow API に URL を通知する。
 * @param {string[]} urls - 通知する絶対 URL の配列（最大 10,000 件）
 * @returns {Promise<{ ok: boolean, status?: number, error?: string }>}
 */
export const notifyIndexNow = async (urls) => {
  const key = env.INDEXNOW_KEY;
  if (!key) {
    console.warn('[indexnow] INDEXNOW_KEY is not configured. Skipping IndexNow notification.');
    return { ok: false, error: 'INDEXNOW_KEY not configured' };
  }

  const validUrls = Array.isArray(urls)
    ? urls.filter((u) => typeof u === 'string' && u.startsWith('https://'))
    : [];

  if (validUrls.length === 0) {
    return { ok: false, error: 'No valid URLs to submit' };
  }

  try {
    const body = {
      host: new URL(SITE.url).hostname,
      key,
      keyLocation: `${SITE.url}/${key}.txt`,
      urlList: validUrls.slice(0, 10000)
    };

    const response = await fetch(INDEXNOW_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body)
    });

    // IndexNow は成功時に 200 or 202 を返す
    if (!response.ok && response.status !== 202) {
      const text = await response.text().catch(() => '');
      console.error(`[indexnow] API returned ${response.status}`, text);
      return { ok: false, status: response.status, error: text };
    }

    console.log(`[indexnow] Submitted ${validUrls.length} URL(s).`);
    return { ok: true, status: response.status };
  } catch (error) {
    console.error('[indexnow] Failed to call IndexNow API:', error);
    return { ok: false, error: String(error) };
  }
};
