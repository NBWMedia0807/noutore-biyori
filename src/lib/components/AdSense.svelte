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
      // ナビゲーション後は折りたたみ状態に戻してから再観測
      if (containerRef) {
        containerRef.style.removeProperty('display');
        containerRef.classList.remove('revealed');
      }
      observeViewport();
    }
  }

  /**
   * IntersectionObserver でコンテナがビューポートに近づいたらプッシュ。
   * visibility:hidden なら IO は機能するのでコンテナ自身を観測する。
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
      { rootMargin: '400px 0px' }
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

  /** 広告確定後: 折りたたみ解除して表示 */
  function reveal() {
    if (containerRef) {
      containerRef.classList.add('revealed');
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
    max-width: 100%;
    display: block;
    text-align: center;
    overflow: visible;
    line-height: 0;
    font-size: 0;
    box-sizing: border-box;

    /*
     * ロード前: visibility:hidden + overflow:hidden + max-height:0 で
     * 視覚的に非表示かつ flex gap の影響をゼロにする。
     * display:block を維持することで Google AdSense が広告を描画できる。
     */
    visibility: hidden;
    max-height: 0;
    overflow: hidden;
  }

  /* 広告ロード完了後に revealed クラスで解放 */
  .adsense-container.revealed {
    visibility: visible;
    max-height: none;
    overflow: visible;
  }

  .adsense-container :global(ins.adsbygoogle) {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  .adsense-container:has(> ins.adsbygoogle[data-ad-status='unfilled']) {
    display: none !important;
  }
</style>
