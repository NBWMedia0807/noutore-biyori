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
  let initialized = false;

  // ページパスが変わるたびに広告を再初期化する
  $: if (browser && $page?.url?.pathname && $page.url.pathname !== currentPath) {
    currentPath = $page.url.pathname;
    if (initialized) pushAd();
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
   * AdSenseがiframeのheight属性を設定するまでポーリングし、
   * 確定したら高さをコンテナに適用してポーリングを停止する。
   */
  function startPolling() {
    stopPolling();
    let attempts = 0;
    pollTimer = setInterval(() => {
      attempts++;
      if (attempts > 60) {
        stopPolling();
        return;
      }
      syncHeight();
    }, 100); // 最大6秒間試みる
  }

  function stopPolling() {
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  /**
   * iframeのheight属性（AdSenseが平文で設定する）を読み取り、
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
      // コンテナ全体を広告の実高に縮小（下部余白トルツメ）
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
  /*
   * フルブリード広告コンテナ
   * ─────────────────────────────────────────────
   * 親が padding や flex を持っていても確実に 100vw に広げるため、
   * `left: 50%; transform: translateX(-50%)` 方式を採用。
   * margin-left 方式よりも flex コンテナ内での挙動が安定する。
   * ─────────────────────────────────────────────
   * 高さは JS の syncHeight() で iframe の実寸に合わせてセットされる。
   * JS が動く前は height: auto のため、高さは AdSense のデフォルト。
   */
  .adsense-container {
    position: relative;
    left: 50%;
    transform: translateX(-50%);
    width: 100vw;
    overflow: hidden;
    line-height: 0;
    font-size: 0;
    box-sizing: border-box;
  }

  /* ins 本体: AdSense スクリプトが内部で幅・高さを操作するが、
     幅は CSS で 100% に固定し、不要な余白を排除する */
  .adsense-container :global(ins.adsbygoogle) {
    display: block !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* AdSense が生成する内部 div・iframe も余白ゼロ・幅 100% に */
  .adsense-container :global(ins.adsbygoogle > div),
  .adsense-container :global(ins.adsbygoogle iframe) {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }
</style>
