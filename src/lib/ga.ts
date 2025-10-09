const SCRIPT_ID = 'ga4-gtag-script';
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

  if (typeof window.gtag !== 'function') {
    window.dataLayer = window.dataLayer || [];
    const dataLayer = window.dataLayer;
    function gtag(...args: unknown[]) {
      dataLayer.push(args);
    }

    window.gtag = gtag;
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      send_page_view: false
    });
  }

  if (!document.getElementById(SCRIPT_ID)) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.id = SCRIPT_ID;
    document.head.appendChild(script);
  }

  isInitialized = true;
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
    send_to: measurementId
  });
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}
