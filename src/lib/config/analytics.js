// GA4（サイト本体）の測定IDを解決する唯一の場所。
//
// ── なぜフォールバックを持つか ────────────────────────────
// 実体は Vercel の環境変数 `VITE_GA_ID`。`VITE_` プレフィックスの変数は
// **ビルド時に値が埋め込まれる**ため、Vercel に環境変数を足しただけでは反映されず、
// 再デプロイが必要になる。設定漏れ・再デプロイ漏れ・Preview 環境への設定漏れで
// サイト全体が丸ごと無計測になる事故を防ぐため、値が無い／プレースホルダのままの
// ときは既定の測定IDへフォールバックする。
//
// ── ハードコードの扱い ──────────────────────────────────
// サイト本体の測定IDはこのファイルだけが持つ。app.html への埋め込みも
// hooks.server.js が `%ga.measurementId%` を置換して行うため、
// 測定IDを書いた箇所が増えることはない。
// （フィード配信 = SmartNews / Gunosy 側は別環境で動く別実装のため、
//   今回は統合対象外。第2段階でストリーム分離とあわせて整理する）
const DEFAULT_MEASUREMENT_ID = 'G-855Y7S6M95';

/**
 * 環境変数の値を検証して測定IDに解決する。
 *
 * 信用しない値:
 *   - 未設定・空文字
 *   - `.env.local.example` のプレースホルダ `G-XXXXXXXXXX`
 *   - `G-` で始まらない値（設定ミス）
 *
 * @param {unknown} value 環境変数から読んだ生の値
 * @returns {string} 実際に計測へ使う測定ID
 */
export const resolveMeasurementId = (value) => {
  const id = typeof value === 'string' ? value.trim() : '';
  if (!id) return DEFAULT_MEASUREMENT_ID;
  if (/X{4,}/.test(id)) return DEFAULT_MEASUREMENT_ID;
  if (!/^G-[A-Z0-9]+$/.test(id)) return DEFAULT_MEASUREMENT_ID;
  return id;
};

/** サイト本体の GA4 測定ID。必ず有効な `G-` 形式の文字列になる。 */
export const GA_MEASUREMENT_ID = resolveMeasurementId(import.meta.env.VITE_GA_ID);

/**
 * app.html 内で測定IDを埋める位置に置いたプレースホルダ。
 * hooks.server.js の transformPageChunk がこれを GA_MEASUREMENT_ID へ置換する。
 */
export const GA_MEASUREMENT_ID_PLACEHOLDER = '%ga.measurementId%';
