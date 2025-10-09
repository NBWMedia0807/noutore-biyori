<script>
  export let data;
  import ArticleCard from '$lib/components/ArticleCard.svelte';
  import ArticleGrid from '$lib/components/ArticleGrid.svelte';
  
  let quizzes = [];
  let visibleQuizzes = [];

  $: quizzes = Array.isArray(data?.quizzes) ? data.quizzes : [];
  $: visibleQuizzes = quizzes
    .filter((quiz) => quiz?.slug)
    .slice()
    .sort((a, b) => {
      const aDate = new Date(a?.publishedAt ?? a?._createdAt ?? 0).getTime();
      const bDate = new Date(b?.publishedAt ?? b?._createdAt ?? 0).getTime();
      return bDate - aDate;
    });
</script>

<h1 style="margin:16px 0;text-align:center;">新着記事</h1>

{#if !visibleQuizzes.length}
  <p>まだクイズが投稿されていません。</p>
{:else}
  <ArticleGrid minWidth={280} gap={24}>
    {#each visibleQuizzes as quiz (quiz.slug)}
      <ArticleCard {quiz} />
    {/each}
  </ArticleGrid>
{/if}
