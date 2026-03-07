<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';

  /** @type {string} 広告スロットID */
  export let slot;

  const AD_CLIENT = 'ca-pub-2298313897414846';

  let adRef;
  /** @type {HTMLDivElement|null} */
  let containerRef;
  let currentPath = '';
  let mutationObs;
  let resizeObs;

  // ページパスが変わるたびに広告を再初期化する
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
   * iframeの実際の高さに合わせてコンテナの高さを更新する（トルツメ）
   * @param {HTMLIFrameElement} iframe
   */
  function trimToIframeHeight(iframe) {
    const heightVal = iframe.getAttribute('height');
    const h = heightVal ? parseInt(heightVal) : 0;
    if (h > 0) {
      const px = `${h}px`;
      // ins タグの高さを実寸に固定
      adRef.style.setProperty('height', px, 'important');
      adRef.style.setProperty('min-height', px, 'important');
      adRef.style.setProperty('max-height', px, 'important');
      // 外側コンテナも合わせる
      if (containerRef) {
        containerRef.style.setProperty('height', px, 'important');
        containerRef.style.setProperty('min-height', px, 'important');
        containerRef.style.setProperty('max-height', px, 'important');
      }
    }
  }

  /**
   * ins の中に iframeが入ったら ResizeObserver で監視して高さを追随させる
   */
  function watchIframe() {
    if (!adRef || adRef.dataset.adStatus !== 'filled') return;
    const iframe = adRef.querySelector('iframe');
    if (!iframe) return;

    // 即座に1回トルツメ
    trimToIframeHeight(iframe);

    // iframeのサイズが動的に変わった場合にも追随する
    if (!resizeObs) {
      resizeObs = new ResizeObserver(() => {
        const f = adRef?.querySelector('iframe');
        if (f) trimToIframeHeight(f);
      });
    }
    resizeObs.observe(iframe);
  }

  onMount(() => {
    pushAd();

    // data-ad-status の変化 + iframe の挿入を監視
    mutationObs = new MutationObserver(() => {
      watchIframe();
    });

    if (adRef) {
      mutationObs.observe(adRef, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-ad-status', 'height'],
      });
    }

    return () => {
      mutationObs?.disconnect();
      resizeObs?.disconnect();
    };
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
    margin-left: calc(50% - 50vw);
    margin-right: calc(50% - 50vw);
    position: relative;
    line-height: 0;
    font-size: 0;
    box-sizing: border-box;
    overflow: hidden;
  }

  .adsense-container :global(ins.adsbygoogle) {
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    display: block !important;
    min-height: 0 !important; /* 広告が入るまで余白を作らない */
  }

  /* iframeも横幅100%・高さautoで確実に表示 */
  .adsense-container :global(ins.adsbygoogle iframe) {
    width: 100% !important;
    max-width: 100% !important;
    display: block !important;
  }

  /* 未配信と判定された場合のみコンテナごと非表示 */
  .adsense-container:has(> ins.adsbygoogle[data-ad-status='unfilled']) {
    display: none;
  }
</style>
