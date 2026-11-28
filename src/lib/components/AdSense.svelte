<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { isWorkersDevHost } from '$lib/staging-host.js';

  /** @type {string} */
  export let slot;
  /**
   * 高さ予約(px)。ほぼ確実に配信される固定枠のみ指定し、
   * 広告読み込みによるレイアウトシフト(CLS)を防ぐ。0なら予約なし。
   * @type {number}
   */
  export let minHeight = 0;
  export let showLabel = false;

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

  /** ポーリング開始済みのパス（同じパスでの二重 push 防止） */
  let pushedPath = '';
  /** 遷移ごとに増やす世代番号。古い遷移の tick 待ちを捨てるために使う */
  let navToken = 0;
  let destroyed = false;

  // ページ遷移時は {#key currentPath} で <ins> をDOMごと作り直す。
  // 既に広告が入った <ins> への再pushはAdSense側で拒否され、
  // 前ページの広告が表示され続けてしまう（インプレッション損失）ため。
  // ※ この $: はDOM更新より前に走るので、ここで直接 push すると
  //   adRef が古い <ins>（または null）のままになる。tick() 後に監視を再開する。
  $: if (browser && $page?.url?.pathname && $page.url.pathname !== currentPath) {
    currentPath = $page.url.pathname;
    if (initialized && adsenseRequestsAllowed()) {
      resetForNavigation();
    }
  }

  async function resetForNavigation() {
    const token = ++navToken;
    adPushed = false;
    pushedPath = '';
    intersectionObs?.disconnect();
    stopPolling();
    if (containerRef) {
      containerRef.classList.remove('revealed');
      // unfilled時に付与した display:none を解除して新しい枠を計測可能にする
      containerRef.style.removeProperty('display');
    }
    // {#key} で新しい <ins> が DOM に載り、bind:this が更新されるのを待つ
    await tick();
    if (destroyed || token !== navToken || !adsenseRequestsAllowed()) return;
    observeViewport();
  }

  function adsenseRequestsAllowed() {
    return browser && !isWorkersDevHost(window.location.hostname);
  }

  function observeViewport() {
    intersectionObs?.disconnect();
    if (!containerRef || destroyed) return;

    intersectionObs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !adPushed) {
          // ポーリング開始時に監視を外す。ins 未接続なら次の交差で再試行する
          if (pushAd()) {
            intersectionObs?.disconnect();
          }
        }
      },
      { rootMargin: '400px 0px' }
    );
    intersectionObs.observe(containerRef);
  }

  function pushAd() {
    if (!adRef || destroyed || !adsenseRequestsAllowed()) return false;
    if (!adRef.isConnected) return false;
    // 同じパスで二重 push しない
    if (pushedPath === currentPath) return false;
    pushedPath = currentPath;
    adPushed = true;
    if (!adRef.hasAttribute('data-adsbygoogle-status')) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (_) {}
    }
    startPolling();
    return true;
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
    if (!adsenseRequestsAllowed()) return;
    observeViewport();
  });

  onDestroy(() => {
    destroyed = true;
    navToken++;
    stopPolling();
    intersectionObs?.disconnect();
  });
</script>

<div
  class="adsense-container"
  class:ad-reserved={minHeight > 0}
  style={minHeight > 0 ? `min-height:${minHeight}px` : null}
  bind:this={containerRef}
>
  {#if showLabel}
    <p class="ad-label">広告</p>
  {/if}
  {#key currentPath}
    <ins
      bind:this={adRef}
      class="adsbygoogle"
      style="display:block"
      data-ad-client={AD_CLIENT}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    ></ins>
  {/key}
</div>

<style>
  .ad-label {
    margin: 0 0 8px;
    color: #475569;
    font-size: 0.875rem;
    line-height: 1.4;
  }

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
     * visibility:hidden で非表示スタート。
     * display:block を維持することで Google が広告を描画できる。
     * revealed クラス付与時に表示切替。
     */
    visibility: hidden;
  }

  /* 広告ロード完了後に表示。
     revealed は classList で付けるため、:global を付けないと Svelte 5 が
     「未使用セレクタ」として出力から削除し、枠が hidden のままになる */
  .adsense-container:global(.revealed) {
    visibility: visible;
  }

  .adsense-container :global(ins.adsbygoogle) {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  /* unfilled 時は非表示 */
  .adsense-container:has(> :global(ins.adsbygoogle[data-ad-status='unfilled'])) {
    display: none !important;
  }
</style>
