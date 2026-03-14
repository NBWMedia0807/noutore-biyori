/**
 * IndexNow API エンドポイント
 *
 * Sanity Webhook → /api/revalidate → このエンドポイント → IndexNow API
 * という流れで記事公開時に検索エンジンへ即時通知する。
 *
 * 必要な環境変数:
 *   INDEXNOW_KEY  - IndexNow キー文字列（英数字・ハイフン・アンダースコア、8〜128文字）
 *
 * IndexNow キーファイル:
 *   static/{INDEXNOW_KEY}.txt の内容にキー文字列を記述してください。
 *   例: static/abcd1234abcd1234.txt → "abcd1234abcd1234"
 */

import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { notifyIndexNow } from '$lib/server/indexnow.js';

/**
 * POST /api/indexnow
 * Body: { urls: string[] }
 * Header: x-revalidate-key: <SANITY_REVALIDATE_SECRET>
 */
export const POST = async (event) => {
  const secret = env.SANITY_REVALIDATE_SECRET || env.VERCEL_REVALIDATE_TOKEN || '';
  const provided =
    event.request.headers.get('x-revalidate-key') ||
    event.url.searchParams.get('secret') ||
    '';

  if (!secret || provided !== secret) {
    return json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  let urls;
  try {
    const body = await event.request.json();
    urls = Array.isArray(body?.urls) ? body.urls : [];
  } catch {
    return json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const result = await notifyIndexNow(urls);
  const status = result.ok || result.error === 'INDEXNOW_KEY not configured' ? 200 : 500;
  return json(result, { status });
};

export const GET = () => json({ ok: false, message: 'Method Not Allowed' }, { status: 405 });
