// src/lib/analytics/pageViewTracker.js
//
// 本体サイト（noutorebiyori.com）の page_view を「1ページ表示につき1回」に保つための
// 純粋ロジック。ブラウザ API に依存しないので Node からそのままテストできる。
//
// ── なぜ必要か ──────────────────────────────────────────
// 初回表示は onMount、SPA 遷移は afterNavigate から page_view を送っている。
// SvelteKit の初回ハイドレーションでは afterNavigate も発火するため、
// 実装のちょっとした変更で「初回だけ2回送る」事故が起きやすい。
// 送信の直前にここを通し、同じパスへの二重送信を短時間だけ弾いておく。
//
// 同じパスを続けて開く操作（例: 同じ記事へのリンクを再度踏む）は
// GA4 でも別の page_view として数えたいので、無条件の重複排除にはしない。
// 「直前と同じパス」かつ「DEDUPE_WINDOW_MS 以内」のときだけ弾く。

/** 同一パスの二重送信とみなす時間差（ミリ秒） */
export const DEDUPE_WINDOW_MS = 1000;

/**
 * page_view 送信の重複排除を行うトラッカーを作る。
 *
 * @param {object} options
 * @param {(path: string) => void} options.send 実際に GA4 へ送る関数
 * @param {() => number} [options.now] 現在時刻（テスト用に差し替え可能）
 * @returns {{ track: (path: string) => boolean, reset: () => void }}
 *   track は実際に送ったら true、重複として弾いたら false を返す。
 */
export const createPageViewTracker = ({ send, now = () => Date.now() } = {}) => {
  let lastPath = null;
  let lastSentAt = 0;

  return {
    track(path) {
      if (typeof path !== 'string' || path === '') return false;

      const at = now();
      if (lastPath === path && at - lastSentAt < DEDUPE_WINDOW_MS) return false;

      lastPath = path;
      lastSentAt = at;
      send(path);
      return true;
    },
    reset() {
      lastPath = null;
      lastSentAt = 0;
    },
  };
};
