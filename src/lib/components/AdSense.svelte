<script>
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';

  /** @type {string} 広告スロットID */
  export let slot;

  const AD_CLIENT = 'ca-pub-2298313897414846';

  let adRef;
  let containerRef;
  let currentPath = '';
  let observer = null;
  let resizeObserver = null;

  $: if (browser && $page?.url?.pathname && $page.url.pathname !== currentPath) {
    currentPath = $page.url.pathname;
    pushAd();
  }

  function pushAd() {
    if (!adRef) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      // AdSenseのスクリプトが未ロードの場合のエラーを無視
    }
  }

  /**
   * 広告の実際の高さにコンテナを合わせて余白を除去する
   */
  function collapseToAdHeight() {
    if (!adRef || !containerRef) return;
    const status = adRef.getAttribute('data-ad-status');

    if (status === 'unfilled') {
      containerRef.style.display = 'none';
      return;
    }

    if (status === 'filled') {
      containerRef.style.display = '';
      // iframe の実際の高さに合わせる
      requestAnimationFrame(() => {
        const iframe = adRef.querySelector('iframe');
        if (iframe && iframe.offsetHeight > 0) {
          containerRef.style.height = iframe.offsetHeight + 'px';
          containerRef.style.overflow = 'hidden';
        }
      });
    }
  }

  function setupObservers() {
    if (!adRef) return;

    // data-ad-status 属性の変化を検知
    observer = new MutationObserver(() => {
      collapseToAdHeight();
    });
    observer.observe(adRef, {
      attributes: true,
      attributeFilter: ['data-ad-status'],
      childList: true,
      subtree: true,
    });

    // iframe のリサイズを検知（遅延読み込み対策）
    resizeObserver = new ResizeObserver(() => {
      collapseToAdHeight();
    });
    resizeObserver.observe(adRef);
  }

  onMount(() => {
    pushAd();
    setupObservers();
  });

  onDestroy(() => {
    if (observer) observer.disconnect();
    if (resizeObserver) resizeObserver.disconnect();
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
    width: 100vw;
    position: relative;
    left: 50%;
    transform: translateX(-50%);
    line-height: 0;
    font-size: 0;
    min-height: 0;
    box-sizing: border-box;
  }

  .adsense-container :global(ins.adsbygoogle) {
    margin: 0 auto !important;
    padding: 0 !important;
  }
</style>
