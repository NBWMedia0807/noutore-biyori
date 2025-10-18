<script>
  import ArticleCard from '$lib/components/ArticleCard.svelte';
  import ArticleGrid from '$lib/components/ArticleGrid.svelte';
  import Pagination from '$lib/components/Pagination.svelte';

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
  const newestQuizzes = Array.isArray(data?.newest) ? data.newest : [];
  const popularQuizzes = Array.isArray(data?.popular) ? data.popular : [];
  const categorySections = Array.isArray(data?.categories)
    ? data.categories.filter((section) => Array.isArray(section?.quizzes) && section.quizzes.length > 0)
    : [];

  const pagination = data?.pagination ?? null;

  const hasNewest = newestQuizzes.length > 0;
  const hasPopular = popularQuizzes.length > 0;
</script>

<main class="home-page">
  <section class="hero" aria-labelledby="hero-title">
    <div class="hero-content">
      <h1 id="hero-title">脳トレ日和で毎日の思考トレーニングを</h1>
      <p>
        間違い探しや計算問題など、多彩なジャンルのクイズで脳を刺激しましょう。初心者の方でも楽しめるよう、やさしい問題から少し難しい問題まで幅広くご用意しています。
      </p>
      {#if hasNewest}
        <a class="hero-cta" href="#newest-quizzes">最新のクイズを見る</a>
      {:else if categorySections.length}
        <a class="hero-cta" href="#category-heading">カテゴリから選ぶ</a>
      {/if}
    </div>
    <div class="hero-visual" aria-hidden="true">
      <img src="/logo.svg" alt="脳トレ日和のロゴ" />
    </div>
  </section>

  {#if hasNewest}
    <section class="home-section" aria-labelledby="newest-heading" id="newest-quizzes">
      <header class="section-header">
        <h2 id="newest-heading">
          <SectionIcon name="brain-icon" className="section-icon" /> 新着クイズ
        </h2>
        <p>公開されたばかりの最新クイズから挑戦してみましょう。</p>
      </header>
      <ArticleGrid minWidth={240} gap={20}>
        {#each newestQuizzes as quiz (quiz.slug)}
          <ArticleCard {quiz} />
        {/each}
      </ArticleGrid>
      {#if pagination?.totalPages > 1}
        <Pagination
          basePath={pagination?.basePath ?? '/'}
          currentPage={pagination?.currentPage ?? 1}
          totalPages={pagination?.totalPages ?? 1}
          totalCount={pagination?.totalCount ?? newestQuizzes.length}
          pageSize={pagination?.pageSize ?? newestQuizzes.length}
        />
      {/if}
    </section>
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
