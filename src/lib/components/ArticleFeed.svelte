<script>
  import ArticleCard from '$lib/components/ArticleCard.svelte';
  import ArticleGrid from '$lib/components/ArticleGrid.svelte';
  import AdSense from '$lib/components/AdSense.svelte';
  import { FEED_AD_SLOTS } from '$lib/config/ads.js';

  /** 表示する記事（クイズプレビュー）の配列 */
  export let quizzes = [];
  /** 何枚ごとに広告を差し込むか */
  export let adInterval = 3;
  /** 先頭カードをLCP優先で読み込むか（TOPの新着のみ true 推奨） */
  export let priorityFirst = false;
  export let minWidth = 240;
  export let gap = 20;

  // カードと広告を交互に並べた描画リストを構築する。
  // 広告は adInterval 枚ごと（3,6,9,12…）に挿入し、出現順に
  // FEED_AD_SLOTS のスロットIDを割り当てる（用意した枠数を上限とする）。
  $: items = buildItems(quizzes, adInterval);

  function buildItems(list, interval) {
    const out = [];
    let adCount = 0;
    const source = Array.isArray(list) ? list : [];
    source.forEach((quiz, index) => {
      out.push({ type: 'card', quiz, index });
      if ((index + 1) % interval === 0 && adCount < FEED_AD_SLOTS.length) {
        out.push({ type: 'ad', slot: FEED_AD_SLOTS[adCount], key: `feed-ad-${adCount}` });
        adCount += 1;
      }
    });
    return out;
  }
</script>

<ArticleGrid {minWidth} {gap}>
  {#each items as item (item.type === 'ad' ? item.key : item.quiz.slug)}
    {#if item.type === 'ad'}
      <div class="feed-ad">
        <AdSense slot={item.slot} />
      </div>
    {:else}
      <ArticleCard quiz={item.quiz} priority={priorityFirst && item.index === 0} />
    {/if}
  {/each}
</ArticleGrid>

<style>
  /* 記事3枚ごとの広告はグリッド全幅の行として表示する */
  .feed-ad {
    grid-column: 1 / -1;
  }

  /*
   * 広告が未配信(unfilled)のときはラッパーごと折りたたむ。
   * AdSense.svelte が非表示にするのは内側の .adsense-container のみのため、
   * ラッパー .feed-ad をグリッドから外さないと、広告が消えても記事3枚ごとに
   * グリッドの行ギャップ分の余分な空白が一覧へ残ってしまう。
   */
  .feed-ad:has(:global(ins.adsbygoogle[data-ad-status='unfilled'])) {
    display: none;
  }

  /*
   * SP（モバイル）のみ表示。
   * PC・タブレット幅では display:none にする。
   * display:none の要素は IntersectionObserver が交差を検知しないため、
   * AdSense.svelte 側の広告 push 自体が走らず、広告リクエストも発生しない。
   */
  @media (min-width: 768px) {
    .feed-ad {
      display: none;
    }
  }
</style>
