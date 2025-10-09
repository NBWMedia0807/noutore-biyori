const GA_SCRIPT_ID = 'ga-gtag';
let isInitialized = false;
let hasWarnedMissingId = false;

const getMeasurementId = (): string | null => {
  const id = import.meta.env.VITE_GA_ID?.toString().trim();
  if (!id) {
    if (typeof window !== 'undefined' && !hasWarnedMissingId) {
      console.warn('VITE_GA_IDが設定されていないため、Google Analyticsを初期化しません。');
      hasWarnedMissingId = true;
    }
    return null;
  }
  return id;
};

const ensureGtagFunction = () => {
  if (typeof window === 'undefined') return;
  if (!window.dataLayer) {
    window.dataLayer = [];
  }
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    };
  }
};

export const loadGtagOnce = () => {
  if (typeof window === 'undefined') return;

  const measurementId = getMeasurementId();
  if (!measurementId) return;
  if (isInitialized) return;

  ensureGtagFunction();

  if (!document.getElementById(GA_SCRIPT_ID)) {
    const script = document.createElement('script');
    script.id = GA_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);
  }

  window.gtag?.('js', new Date());
  window.gtag?.('config', measurementId, { send_page_view: false });

  isInitialized = true;
};

export const sendPageView = (path?: string) => {
  if (typeof window === 'undefined') return;

  const measurementId = getMeasurementId();
  if (!measurementId) return;

  ensureGtagFunction();

  const pagePath = path ?? `${window.location.pathname}${window.location.search}`;

  window.gtag?.('event', 'page_view', {
    page_path: pagePath,
    page_location: window.location.href,
  });
};

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}
