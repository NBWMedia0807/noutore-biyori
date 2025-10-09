<script>
  export let as = 'div';
  export let minWidth = 220;
  export let gap = 16;
</script>

<svelte:element this={as} class="article-grid" style={`--min-width:${minWidth}px;--gap:${gap}px`}>
  <slot />
</svelte:element>

<style>
  .article-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(var(--min-width, 220px), 1fr));
    gap: var(--gap, 16px);
  }
</style>
