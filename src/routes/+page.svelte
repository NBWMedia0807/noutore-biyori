<script>
  import ArticleCard from '$lib/components/ArticleCard.svelte';
  import ArticleGrid from '$lib/components/ArticleGrid.svelte';

  export let data;

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

<section class="home-latest">
  <header class="home-latest__header">
    <h1 class="home-latest__title">新着クイズ</h1>
  </header>

  {#if !visibleQuizzes.length}
    <p class="home-latest__empty">まだクイズが投稿されていません。</p>
  {:else}
    <ArticleGrid>
      {#each visibleQuizzes as quiz (quiz.slug)}
        <ArticleCard {quiz} />
      {/each}
    </ArticleGrid>
  {/if}
</section>

<style>
  .home-latest {
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
    padding: 1rem 0 2.5rem;
  }

  .home-latest__header {
    display: flex;
    justify-content: center;
  }

  .home-latest__title {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 1.25rem 2.5rem;
    border-radius: 20px;
    background: linear-gradient(
      135deg,
      rgba(255, 221, 118, 0.7) 0%,
      rgba(251, 191, 36, 0.6) 50%,
      rgba(245, 158, 11, 0.6) 100%
    );
    border: 1px solid rgba(249, 115, 22, 0.35);
    box-shadow: 0 14px 28px rgba(255, 193, 7, 0.18);
    color: #92400e;
    font-size: clamp(1.75rem, 1.3rem + 1.2vw, 2.5rem);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-align: center;
  }

  .home-latest__title::after {
    content: '';
    position: absolute;
    inset: 4px;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.65);
    pointer-events: none;
  }

  .home-latest__empty {
    text-align: center;
    color: var(--medium-gray);
  }

  @media (max-width: 640px) {
    .home-latest {
      gap: 1.5rem;
      padding: 0.5rem 0 2rem;
    }

    .home-latest__title {
      width: 100%;
      padding: 1rem 1.5rem;
      border-radius: 16px;
      letter-spacing: 0.04em;
    }

    .home-latest__title::after {
      border-radius: 12px;
    }
  }
</style>
