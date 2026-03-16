<script>
  import { onMount, onDestroy } from 'svelte';

  /** @type {string} */
  export let slot;

  const AD_CLIENT = 'ca-pub-2298313897414846';

  /** @type {HTMLElement|null} */
  let adRef = null;
  /** @type {HTMLDivElement|null} */
  let containerRef = null;
  /** @type {ReturnType<typeof setInterval>|null} */
  let pollTimer = null;

  function stopPolling() {
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  onMount(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (_) {}

    let attempts = 0;
    pollTimer = setInterval(() => {
      if (++attempts > 60) {
        stopPolling();
        return;
      }
      if (!adRef || !containerRef) return;

      if (adRef.dataset.adStatus === 'unfilled') {
        containerRef.style.setProperty('display', 'none', 'important');
        stopPolling();
        return;
      }

      const iframe = adRef.querySelector('iframe');
      if (iframe && iframe.offsetHeight > 0) {
        stopPolling();
      }
    }, 200);
  });

  onDestroy(stopPolling);
</script>

<div class="side-rail-ad" bind:this={containerRef}>
  <ins
    bind:this={adRef}
    class="adsbygoogle"
    style="display:block"
    data-ad-client={AD_CLIENT}
    data-ad-slot={slot}
    data-ad-format="auto"
    data-full-width-responsive="false"
  ></ins>
</div>

<style>
  .side-rail-ad {
    width: 160px;
    min-height: 250px;
  }

  .side-rail-ad :global(ins.adsbygoogle) {
    display: block !important;
    width: 160px !important;
  }
</style>
