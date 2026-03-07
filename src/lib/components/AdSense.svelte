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
    width: 100%;
    overflow: hidden;
    /* 広告未配信時にコンテナが余計な高さを持たないようにする */
    line-height: 0;
    font-size: 0;
    min-height: 0;
  }

  /* 広告が配信された場合のみ表示される ins 要素 */
  .adsense-container :global(ins.adsbygoogle) {
    margin: 0 !important;
    padding: 0 !important;
  }

  /* AdSense が iframe を挿入した場合、余白を除去 */
  .adsense-container :global(ins.adsbygoogle[data-ad-status='unfilled']) {
    display: none !important;
    height: 0 !important;
    min-height: 0 !important;
  }
</style>
