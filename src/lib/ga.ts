import { GA_MEASUREMENT_ID } from './config/analytics.js';

/**
 * GA4 の page_view を1件送信する。
 *
 * ── 責務の境界 ──────────────────────────────────────────
 * GA4 の初期化（gtag.js のロード / `gtag('js')` / `gtag('config', …)`）は
 * **src/app.html が初期HTMLの解析時点で完了させている**。
 * このモジュールはイベント送信だけを担当し、script の動的注入は一切行わない。
 *
 * app.html 側の config は `send_page_view: false` なので、
 * page_view はここからの送信だけで1ページにつき1回になる。
 * 呼び出し元は +layout.svelte の2箇所（初回の onMount / SPA遷移の afterNavigate）。
 *
 * @param path 計測対象のパス（クエリ文字列を含む）
 */
export const sendPageView = (path: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  // app.html のタグが何らかの理由（ネットワーク遮断・広告ブロッカー等）で
  // 動いていない場合は、例外を出さずに黙って何もしない。
  // gtag は app.html のインラインスクリプトで dataLayer への push 関数として
  // 定義されるため、通常はここを通る時点で必ず存在する。
  if (typeof window.gtag !== 'function') {
    return;
  }

  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
    send_to: GA_MEASUREMENT_ID
  });
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}
