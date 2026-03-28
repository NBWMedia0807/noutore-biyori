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
   * rootMargin を 400px に拡大してより早めにロードし、
   * ビューアビリティ率・CPM を向上させる。
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
      { rootMargin: '400px 0px' } // 200px → 400px に拡大してプリロードを早める
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
    width: 100%;
    display: block;
    text-align: center;
    /*
     * overflow: hidden → visible に変更
     * 「hidden」だとAdSenseが描画するiframeやバナー画像が
     * コンテナ境界でクロップされる原因になるため削除。
     */
    overflow: visible;
    line-height: 0;
    font-size: 0;
    box-sizing: border-box;

    /*
     * 広告ロード前は非表示（AdSense側が ins に visibility:visible を設定するまで非表示）
     * min-height は設定しない：ロード前の不可視空白（レイアウトズレ）を防ぐ
     */
    visibility: hidden;
  }

  .adsense-container :global(ins.adsbygoogle) {
    display: block !important;
    width: 100% !important;
  }

  .adsense-container:has(> ins.adsbygoogle[data-ad-status='unfilled']) {
    display: none !important;
  }
</style>
