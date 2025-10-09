const DEFAULT_GA_ID = 'G-855Y7S6M95';

export const GA_ID = import.meta.env.VITE_GA_ID || DEFAULT_GA_ID;

const SCRIPT_ID = 'ga4-gtag-script';
const isDev = import.meta.env.DEV;

const warned = new Set<string>();

function warnOnce(key: string, message: string) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(message);
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export function loadGtagOnce(id = GA_ID) {
  if (typeof window === 'undefined') return;

  if (isDev) {
    warnOnce('dev-mode', '[GA4] 開発モードのため gtag.js の読み込みをスキップします');
    return;
  }

  if (!id) {
    warnOnce('missing-id', '[GA4] VITE_GA_ID が未設定のため gtag.js の読み込みをスキップします');
    return;
  }

  if (document.getElementById(SCRIPT_ID)) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  script.id = SCRIPT_ID;
  document.head.appendChild(script);

  window.gtag('js', new Date());
  window.gtag('config', id, { send_page_view: true });
}

export function sendPageView(path: string, id = GA_ID) {
  if (typeof window === 'undefined') return;

  if (isDev) {
    warnOnce('dev-mode', '[GA4] 開発モードのため page_view を送信しません');
    return;
  }

  if (!id) {
    warnOnce('missing-id', '[GA4] VITE_GA_ID が未設定のため page_view を送信しません');
    return;
  }

  if (!window.gtag) return;

  window.gtag('config', id, {
    page_path: path
  });
}

export {}; // Ensures this file is treated as a module
