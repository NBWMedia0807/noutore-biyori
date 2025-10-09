<script>
  import ArticleCard from '$lib/components/ArticleCard.svelte';
  import ArticleGrid from '$lib/components/ArticleGrid.svelte';

  export let quizzes = [];
  export let headingId = 'related-heading';

  const MAX_ITEMS = 6;
  const headingText = '関連記事';

  $: items = Array.isArray(quizzes)
    ? quizzes.filter((quiz) => quiz?.slug).slice(0, MAX_ITEMS)
    : [];
  $: hasItems = items.length > 0;
</script>

{#if hasItems}
  <section class="related-section" aria-labelledby={headingId}>
    <div class="related-header">
      <h2 id={headingId}>{headingText}</h2>
    </div>
    <ArticleGrid>
      {#each items as quiz (quiz.slug)}
        <ArticleCard {quiz} />
      {/each}
    </ArticleGrid>
  </section>
{/if}

<style>
  .related-section {
    background: #fffef6;
    border-radius: 24px;
    padding: 28px 24px 32px;
    box-shadow: 0 18px 45px rgba(249, 115, 22, 0.14);
    border: 1px solid rgba(248, 196, 113, 0.35);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .related-header {
    text-align: center;
  }

  .related-header h2 {
    margin: 0;
    font-size: 1.35rem;
    color: #9a3412;
    font-weight: 800;
  }

  @media (max-width: 768px) {
    .related-section {
      padding: 24px 18px 28px;
      gap: 1.25rem;
    }
  }
</style>
