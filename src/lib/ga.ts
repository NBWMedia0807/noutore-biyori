import { buildTrafficParams } from '$lib/analytics/traffic-source.js';

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

export const loadGtagOnce = () => {
  if (typeof window === 'undefined' || isInitialized) {
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
    inlineScript.text = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){window.dataLayer.push(arguments);}
      window.gtag = gtag;
      gtag('js', new Date());
      gtag('config', ${JSON.stringify(measurementId)}, {"send_page_view": false});
    `;
    document.head.appendChild(inlineScript);
  }

  isInitialized = true;
};

// 判定した流入元をセッション中で使い回すための保存キー。
// 2ページ目以降は document.referrer が自サイトになり判定できなくなるため。
const PARTNER_STORAGE_KEY = 'nb_traffic_partner';

const readStoredPartner = (): string | null => {
  try {
    return window.sessionStorage?.getItem(PARTNER_STORAGE_KEY) ?? null;
  } catch {
    // プライベートモードや Cookie ブロック時は sessionStorage 参照自体が例外になる
    return null;
  }
};

const writeStoredPartner = (partner: string) => {
  try {
    window.sessionStorage?.setItem(PARTNER_STORAGE_KEY, partner);
  } catch {
    // 保存できなくても計測は続行する（毎回判定し直すだけ）
  }
};

/**
 * page_view に添える流入元パラメータを組み立てる。
 *
 * ここは全ページ・全ユーザーのブラウザで動くため、
 * 何が起きても計測とサイト本体を止めないよう、全体を try/catch で囲んでいる。
 * 失敗したら空オブジェクトを返し、これまでどおりの page_view を送る。
 */
const resolveTrafficParams = (): Record<string, string> => {
  try {
    const { partner, params } = buildTrafficParams({
      userAgent: navigator?.userAgent ?? '',
      referrer: document?.referrer ?? '',
      storedPartner: readStoredPartner()
    });
    writeStoredPartner(partner);
    return params;
  } catch {
    return {};
  }
};

export const sendPageView = (path: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  const measurementId = getMeasurementId();
  if (!measurementId || typeof window.gtag !== 'function') {
    return;
  }

  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
    // 流入元の内訳を見るためのパラメータ。
    // セッションの参照元 / メディアには手を加えないので、既存レポートは変わらない。
    ...resolveTrafficParams(),
    send_to: measurementId
  });
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}
