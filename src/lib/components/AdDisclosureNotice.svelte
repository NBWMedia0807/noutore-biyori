<script>
  // 記事タイトルのすぐ下に出す広告表記（ステマ規制）。
  // disclosure は $lib/config/ad-disclosure.js の resolveArticleAdDisclosure() の戻り値。null なら何も出さない。
  /** @type {{ type: string, text: string } | null} */
  export let disclosure = null;
</script>

{#if disclosure?.text}
  <p class="ad-disclosure" data-ad-disclosure={disclosure.type}>{disclosure.text}</p>
{/if}

<style>
  /* 本文と同じくらいの大きさ・はっきりした色（#7c2d12 / #fff7ed のコントラスト比は約 8.8:1） */
  .ad-disclosure {
    margin: 0;
    padding: 0.6rem 0.85rem;
    font-size: 1.05rem;
    line-height: 1.6;
    font-weight: 700;
    color: #7c2d12;
    background: #fff7ed;
    border: 2px solid #c2410c;
    border-radius: 10px;
    overflow-wrap: anywhere;
  }
</style>
