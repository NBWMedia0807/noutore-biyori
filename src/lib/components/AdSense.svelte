<script>
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';

  /** @type {string} 広告スロットID */
  export let slot;

  const AD_CLIENT = 'ca-pub-2298313897414846';

  /** @type {HTMLElement|null} */
  let adRef = null;
  /** @type {HTMLDivElement|null} */
  let containerRef = null;
  let currentPath = '';
  /** @type {ReturnType<typeof setInterval>|null} */
  let pollTimer = null;

  // ページパスが変わるたびに広告を再初期化する
  $: if (browser && $page?.url?.pathname && $page.url.pathname !== currentPath) {
    currentPath = $page.url.pathname;
    pushAd();
  }

  function pushAd() {
    if (!adRef) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (_) {
      // AdSenseのスクリプトが未ロードの場合のエラーを無視
    }
    startPolling();
  }

  /**
   * AdSenseが iframe の height 属性を設定するまでポーリングし、
   * 確定したら高さをコンテナに適用してポーリングを停止する。
   */
  function startPolling() {
    stopPolling();
    let attempts = 0;
    pollTimer = setInterval(() => {
      attempts++;
      if (attempts > 40) {
        stopPolling();
        return;
      } // 最大 4秒間試みる
      syncHeight();
    }, 100);
  }

  function stopPolling() {
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  /**
   * iframe の height 属性（AdSense が平文で設定する）を読み取り、
   * コンテナの高さをその値に揃えることで下部余白をトルツメする。
   */
  function syncHeight() {
    if (!adRef || !containerRef) return;

    // unfilled の場合は非表示にして終了
    if (adRef.dataset.adStatus === 'unfilled') {
      containerRef.style.setProperty('display', 'none', 'important');
      stopPolling();
      return;
    }

    const iframe = adRef.querySelector('iframe');
    if (!iframe) return;

    const h = parseInt(iframe.getAttribute('height') ?? '0', 10);
    if (h > 0) {
      const px = `${h}px`;
      // コンテナを広告の実高に縮小
      containerRef.style.removeProperty('display');
      containerRef.style.setProperty('height', px, 'important');
      containerRef.style.setProperty('max-height', px, 'important');
      // ins タグも同様に
      adRef.style.setProperty('height', px, 'important');
      adRef.style.setProperty('max-height', px, 'important');
      stopPolling();
    }
  }

  onMount(() => {
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
  /*
   * 広告コンテナ
   * - 100vw のフルブリード（ページ幅を超えて画面端まで広げる）
   * - コンテナ自体は height を JS で上書きするため、initial は auto
   * - overflow:hidden で AdSense 内部の余白がはみ出るのを防ぐ
   */
  .adsense-container {
    width: 100vw;
    margin-left: calc(50% - 50vw);
    margin-right: calc(50% - 50vw);
    overflow: hidden;
    line-height: 0;
    font-size: 0;
    box-sizing: border-box;
  }

  /* ins 本体：AdSense スクリプトが幅・高さを設定するが、幅だけは必ず 100% に保つ */
  .adsense-container :global(ins.adsbygoogle) {
    display: block !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* 内部 iframe も 100% 幅に */
  .adsense-container :global(ins.adsbygoogle > div),
  .adsense-container :global(ins.adsbygoogle iframe) {
    width: 100% !important;
    max-width: 100% !important;
    display: block !important;
    margin: 0 !important;
    padding: 0 !important;
  }
</style>
