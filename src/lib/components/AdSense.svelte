<script>
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';

  /** @type {string} */
  export let slot;

  const AD_CLIENT = 'ca-pub-2298313897414846';

  /** @type {HTMLElement|null} */
  let adRef = null;
  /** @type {HTMLDivElement|null} */
  let containerRef = null;
  let currentPath = '';
  /** @type {ReturnType<typeof setInterval>|null} */
  let pollTimer = null;
  let initialized = false;

  $: if (browser && $page?.url?.pathname && $page.url.pathname !== currentPath) {
    currentPath = $page.url.pathname;
    if (initialized) pushAd();
  }

  function pushAd() {
    if (!adRef) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (_) {}
    startPolling();
  }

  function startPolling() {
    stopPolling();
    let attempts = 0;
    pollTimer = setInterval(() => {
      attempts++;
      if (attempts > 80) {
        // 最大8秒
        // タイムアウト時は container を visible に戻して諦める
        reveal();
        stopPolling();
        return;
      }
      syncHeight();
    }, 100);
  }

  function stopPolling() {
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  /** コンテナを表示状態にする */
  function reveal() {
    if (containerRef) {
      containerRef.style.removeProperty('visibility');
      containerRef.style.removeProperty('overflow');
    }
  }

  function syncHeight() {
    if (!adRef || !containerRef) return;

    // unfilled → 非表示のまま終了（visibilityも関係ない）
    if (adRef.dataset.adStatus === 'unfilled') {
      containerRef.style.setProperty('display', 'none', 'important');
      stopPolling();
      return;
    }

    const iframe = adRef.querySelector('iframe');
    if (!iframe) return;

    // height属性（AdSenseが設定する）と実レンダリング高さ(offsetHeight)の両方を確認
    const attrH = parseInt(iframe.getAttribute('height') ?? '0', 10);
    const renderedH = iframe.offsetHeight;
    const h = attrH > 0 ? attrH : renderedH;

    if (h > 0) {
      const px = `${h}px`;

      // コンテナを実高に縮小してから表示
      containerRef.style.setProperty('height', px, 'important');
      containerRef.style.setProperty('max-height', px, 'important');
      adRef.style.setProperty('height', px, 'important');
      adRef.style.setProperty('max-height', px, 'important');

      // AdSense内部div（iframeの兄弟要素）も高さを合わせる
      Array.from(adRef.children).forEach((child) => {
        if (child !== iframe && child instanceof HTMLElement) {
          child.style.setProperty('height', px, 'important');
          child.style.setProperty('max-height', px, 'important');
          child.style.setProperty('overflow', 'hidden', 'important');
        }
      });

      reveal();
      stopPolling();
    }
  }

  onMount(() => {
    initialized = true;
    pushAd();
  });

  onDestroy(() => {
    stopPolling();
  });
</script>

<div class="adsense-container" bind:this={containerRef}>
  <ins
    bind:this={adRef}
    class="adsbygoogle"
    style="display:block"
    data-ad-client={AD_CLIENT}
    data-ad-slot={slot}
    data-ad-format="auto"
    data-full-width-responsive="true"
  ></ins>
</div>

<style>
  .adsense-container {
    /* フルブリード: flex/padding親の中でも正確に100vwに広げる */
    position: relative;
    left: 50%;
    transform: translateX(-50%);
    width: 100vw;
    overflow: hidden;
    line-height: 0;
    font-size: 0;
    box-sizing: border-box;

    /*
     * 広告ロード前は非表示（JSで高さ確定後に reveal() で表示）
     * → ユーザーが空白の「ガタ」を見ない
     */
    visibility: hidden;
  }

  /* ins 本体: 幅は常に 100% */
  .adsense-container :global(ins.adsbygoogle) {
    display: block !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    min-height: 0 !important;
  }

  /* AdSense内部div・iframeも 100%幅・余白ゼロ */
  .adsense-container :global(ins.adsbygoogle > div),
  .adsense-container :global(ins.adsbygoogle iframe) {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* unfilled時は gap が開かないよう完全非表示（JSでも設定するがCSS側でも保険） */
  .adsense-container:has(> ins.adsbygoogle[data-ad-status='unfilled']) {
    display: none !important;
  }
</style>
