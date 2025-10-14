<script>
  export let data;
  import ArticleCard from '$lib/components/ArticleCard.svelte';
  import ArticleGrid from '$lib/components/ArticleGrid.svelte';
  
  let quizzes = [];
  let visibleQuizzes = [];

  $: quizzes = Array.isArray(data?.quizzes) ? data.quizzes : [];
  $: visibleQuizzes = quizzes.filter((quiz) => quiz?.slug);
</script>

<h1 style="margin:16px 0;text-align:center;">新着記事</h1>

{#if !visibleQuizzes.length}
  <p>まだクイズが投稿されていません。</p>
{:else}
  <ArticleGrid>
    {#each visibleQuizzes as quiz (quiz.slug)}
      <ArticleCard {quiz} />
    {/each}
  </ArticleGrid>
{/if}
