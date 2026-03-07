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
  /** @type {IntersectionObserver|null} */
  let intersectionObs = null;
  let adPushed = false;

  $: if (browser && $page?.url?.pathname && $page.url.pathname !== currentPath) {
    currentPath = $page.url.pathname;
    if (initialized) {
      adPushed = false;
      observeViewport();
    }
  }

  /**
   * IntersectionObserver でコンテナがビューポートに近づいたらプッシュ。
   * スクロールされることなく表示される位置（ファーストビュー）なら即時プッシュ。
   * → 表示される広告だけをロードし、ビューアビリティ率・CPMを向上させる。
   */
  function observeViewport() {
    intersectionObs?.disconnect();
    if (!containerRef) return;

    intersectionObs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !adPushed) {
          adPushed = true;
          pushAd();
          intersectionObs?.disconnect();
        }
      },
      { rootMargin: '200px 0px' } // 200px 手前でプッシュ開始
    );
    intersectionObs.observe(containerRef);
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
      if (attempts > 100) {
        // 最大10秒
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

  /** 広告確定後にコンテナを表示・最小高さをリセット */
  function reveal() {
    if (containerRef) {
      containerRef.style.removeProperty('min-height');
      containerRef.style.removeProperty('visibility');
    }
  }

  function syncHeight() {
    if (!adRef || !containerRef) return;

    if (adRef.dataset.adStatus === 'unfilled') {
      containerRef.style.setProperty('display', 'none', 'important');
      stopPolling();
      return;
    }

    const iframe = adRef.querySelector('iframe');
    if (!iframe) return;

    const attrH = parseInt(iframe.getAttribute('height') ?? '0', 10);
    const renderedH = iframe.offsetHeight;
    const h = attrH > 0 ? attrH : renderedH;

    if (h > 0) {
      const px = `${h}px`;
      containerRef.style.setProperty('height', px, 'important');
      containerRef.style.setProperty('max-height', px, 'important');
      adRef.style.setProperty('height', px, 'important');
      adRef.style.setProperty('max-height', px, 'important');

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
    observeViewport();
  });

  onDestroy(() => {
    stopPolling();
    intersectionObs?.disconnect();
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
    position: relative;
    left: 50%;
    transform: translateX(-50%);
    width: 100vw;
    overflow: hidden;
    line-height: 0;
    font-size: 0;
    box-sizing: border-box;

    /*
     * CLS（Cumulative Layout Shift）防止:
     * visibility:hidden の代わりに min-height で空間を確保。
     * Googleはページの CLS スコアを広告オークションの品質基準に利用するため、
     * CLS を最小化することで広告品質スコアが上がり CPM 向上につながる。
     * 標準バナー高さ(100px)を仮確保; JS で実高に上書きする。
     */
    min-height: 100px;
  }

  .adsense-container :global(ins.adsbygoogle) {
    display: block !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    min-height: 0 !important;
  }

  .adsense-container :global(ins.adsbygoogle > div),
  .adsense-container :global(ins.adsbygoogle iframe) {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  .adsense-container:has(> ins.adsbygoogle[data-ad-status='unfilled']) {
    display: none !important;
  }
</style>
