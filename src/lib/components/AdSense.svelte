<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';

  /** @type {string} 広告スロットID */
  export let slot;

  const AD_CLIENT = 'ca-pub-2298313897414846';

  let adRef;
  let currentPath = '';

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

  onMount(() => {
    pushAd();
  });
</script>

<div class="adsense-container">
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

  /* 未配信と判定された場合のみ非表示（読み込み前は非表示にしない） */
  .adsense-container:has(> ins.adsbygoogle[data-ad-status='unfilled']) {
    display: none;
  }
</style>
