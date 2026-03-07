<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';

  /** @type {string} 広告スロットID */
  export let slot;

  const AD_CLIENT = 'ca-pub-2298313897414846';

  let adRef;
  let currentPath = '';
  let observer;

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

    // 配信された広告（iframe）の実サイズに合わせて親要素群の高さを調整（トルツメ）する
    observer = new MutationObserver(() => {
      if (!adRef || adRef.dataset.adStatus !== 'filled') return;

      const iframe = adRef.querySelector('iframe');
      if (iframe) {
        // iframeの高さ属性を取得（AdSenseは通常ここに実サイズを設定する）
        const heightVal = iframe.getAttribute('height');
        if (heightVal && parseInt(heightVal) > 0) {
          const targetHeight = `${parseInt(heightVal)}px`;

          // ins 自体の高さを変更
          adRef.style.setProperty('height', targetHeight, 'important');
          adRef.style.setProperty('min-height', targetHeight, 'important');

          // その内部のラッパー(divなど)の高さも変更して隙間を完全に取り除く
          Array.from(adRef.children).forEach((child) => {
            if (child.tagName.toLowerCase() !== 'iframe') {
              child.style.setProperty('height', targetHeight, 'important');
              child.style.setProperty('min-height', targetHeight, 'important');
            }
          });
        }
      }
    });

    if (adRef) {
      observer.observe(adRef, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-ad-status'],
      });
    }

    return () => {
      if (observer) observer.disconnect();
    };
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
    margin-left: calc(50% - 50vw);
    margin-right: calc(50% - 50vw);
    position: relative;
    line-height: 0;
    font-size: 0;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    background: transparent;
    overflow: hidden; /* 余白などがはみ出ないようにする */
  }

  .adsense-container :global(ins.adsbygoogle) {
    width: 100% !important;
    margin: 0 auto !important;
    padding: 0 !important;
    display: block !important;
  }

  /* 未配信と判定された場合のみ非表示（読み込み前は非表示にしない） */
  .adsense-container:has(> ins.adsbygoogle[data-ad-status='unfilled']) {
    display: none;
  }
</style>
