const SCRIPT_ID = 'ga4-gtag-script';
codex/implement-ga4-basic-tag-in-sveltekit-91ze0f
const MEASUREMENT_DATA_ATTRIBUTE = 'measurementId';
let isInitialized = false;
let hasWarnedMissingId = false;

const readMeasurementIdFromDom = (): string | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const script = document.getElementById(SCRIPT_ID);
  if (script instanceof HTMLScriptElement) {
    const datasetValue = script.dataset?.[MEASUREMENT_DATA_ATTRIBUTE];
    if (datasetValue) {
      return datasetValue;
    }

let isInitialized = false;
let hasWarnedMissingId = false;

const getMeasurementId = (): string | undefined => {
  const id = import.meta.env.VITE_GA_ID;
  if (!id && !hasWarnedMissingId && typeof window !== 'undefined') {
    console.warn('Google Analytics 4: VITE_GA_ID が設定されていません。計測をスキップします。');
    hasWarnedMissingId = true;
main
  }

  return undefined;
};

codex/implement-ga4-basic-tag-in-sveltekit-91ze0f
const getMeasurementId = (): string | undefined => {
  const fromDom = readMeasurementIdFromDom();
  if (fromDom) {
    return fromDom;
  }

  const id = import.meta.env.VITE_GA_ID;
  if (!id && !hasWarnedMissingId && typeof window !== 'undefined') {
    console.warn('Google Analytics 4: VITE_GA_ID が設定されていません。計測をスキップします。');
    hasWarnedMissingId = true;
  }
  return id;
};


main
export const loadGtagOnce = () => {
  if (typeof window === 'undefined' || isInitialized) {
    return;
  }

  const measurementId = getMeasurementId();
  if (!measurementId) {
    return;
  }

codex/implement-ga4-basic-tag-in-sveltekit-91ze0f
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

  const existingScript = document.getElementById(SCRIPT_ID);
  if (existingScript instanceof HTMLScriptElement) {
    if (!existingScript.dataset[MEASUREMENT_DATA_ATTRIBUTE]) {
      existingScript.dataset[MEASUREMENT_DATA_ATTRIBUTE] = measurementId;
    }
  } else if (!existingScript) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.id = SCRIPT_ID;
    script.dataset[MEASUREMENT_DATA_ATTRIBUTE] = measurementId;
    document.head?.appendChild(script);
  }


  if (document.getElementById(SCRIPT_ID)) {
    isInitialized = true;
    return;
  }

  window.dataLayer = window.dataLayer || [];
  function gtag(..._args: unknown[]) {
    window.dataLayer.push(arguments);
  }

  window.gtag = gtag;
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  script.id = SCRIPT_ID;
  document.head.appendChild(script);

main
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
