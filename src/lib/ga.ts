// src/lib/ga.ts
//
// 本体サイト（noutorebiyori.com）の GA4 計測。
//
// ── 本体サイトの page_view の定義 ────────────────────────────
// ここから送る page_view は「noutorebiyori.com の Web ページを実際にロードした閲覧」
// だけを表す。SmartNews SmartView / グノシー系アプリ内ビューアでの閲覧は
// 配信フィード側の計測タグ（$lib/rss/feedAnalytics.js）から
// smartview_page_view / gunosy_page_view として送っており、page_view にはしていない。
// そのため GA4 の「表示回数」は本体サイトの PV と一致する。
//
// すべての page_view に content_surface: 'website' を付けているので、
// GA4 探索では content_surface で面を切り替えられる。

import { createPageViewTracker } from '$lib/analytics/pageViewTracker.js';
import { shouldMeasureHostname } from '$lib/analytics/measurementEnvironment.js';
import { CONTENT_SURFACE } from '$lib/analytics/surfaces.js';
import { detectAppWebview } from '$lib/analytics/appWebview.js';

const SCRIPT_ID = 'ga4-gtag-script';
const INLINE_SCRIPT_ID = `${SCRIPT_ID}-inline-bootstrap`;
let isInitialized = false;
let hasWarnedMissingId = false;

const getMeasurementId = (): string | undefined => {
  const id = import.meta.env.VITE_GA_ID;
  if (!id && !hasWarnedMissingId && typeof window !== 'undefined') {
    console.warn('Google Analytics 4: VITE_GA_ID が設定されていません。計測をスキップします。');
    hasWarnedMissingId = true;
  }
  return id;
};

/** プレビュー / ローカル開発では計測しない（本番プロパティを汚さないため） */
const isMeasurableEnvironment = (): boolean =>
  typeof window !== 'undefined' && shouldMeasureHostname(window.location.hostname);

/**
 * このページを開いたアプリ内ブラウザ。
 * 「アプリ内ビューアか本体サイトか」はイベント名で確実に分かるので、これは
 * 本体サイト PV の内訳（SmartNews のアプリ内ブラウザで開いた PV など）を見るための補助。
 */
const getAppWebview = (): string =>
  detectAppWebview(typeof navigator === 'undefined' ? '' : navigator.userAgent);

export const loadGtagOnce = () => {
  if (typeof window === 'undefined' || isInitialized || !isMeasurableEnvironment()) {
    return;
  }

  const measurementId = getMeasurementId();
  if (!measurementId) {
    return;
  }

  if (!document.getElementById(SCRIPT_ID)) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.id = SCRIPT_ID;
    document.head.appendChild(script);
  }

  if (!document.getElementById(INLINE_SCRIPT_ID)) {
    const inlineScript = document.createElement('script');
    inlineScript.id = INLINE_SCRIPT_ID;
    // send_page_view: false にして、初回表示も SPA 遷移も sendPageView() の1経路に統一する。
    // content_surface / app_webview はここで既定値として持たせ、page_view 以外のイベントにも付ける。
    inlineScript.text = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){window.dataLayer.push(arguments);}
      window.gtag = gtag;
      gtag('js', new Date());
      gtag('config', ${JSON.stringify(measurementId)}, {"send_page_view": false, "content_surface": ${JSON.stringify(CONTENT_SURFACE.website)}, "app_webview": ${JSON.stringify(getAppWebview())}});
    `;
    document.head.appendChild(inlineScript);
  }

  isInitialized = true;
};

const pageViewTracker = createPageViewTracker({
  send: (path: string) => {
    const measurementId = getMeasurementId();
    if (!measurementId || typeof window.gtag !== 'function') {
      return;
    }

    window.gtag('event', 'page_view', {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
      // 「本体サイトのページをロードした閲覧」であることの目印。
      // SmartView / グノシー系アプリ内ビューアの閲覧と GA4 上で区別するために使う。
      content_surface: CONTENT_SURFACE.website,
      // 本体サイト PV の内訳。どのアプリのアプリ内ブラウザで開かれたか（推定）。
      // セッションの参照元と違ってイベント単位なので、SmartView からの遷移で
      // セッションが続いていても、この1 PV 単独で判定できる。
      app_webview: getAppWebview(),
      send_to: measurementId,
    });
  },
});

/**
 * page_view を1回送る。
 * 同一パスへの二重送信（初回表示で onMount と afterNavigate が重なるケース）は
 * pageViewTracker 側で弾く。
 *
 * @returns 実際に送ったら true、重複として弾いたら false
 */
export const sendPageView = (path: string): boolean => {
  if (typeof window === 'undefined' || !isMeasurableEnvironment()) {
    return false;
  }

  return pageViewTracker.track(path);
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}
