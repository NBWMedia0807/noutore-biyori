<script>
  import SectionIcon from '$lib/components/SectionIcon.svelte';
  import ArticleCard from '$lib/components/ArticleCard.svelte';
  import ArticleGrid from '$lib/components/ArticleGrid.svelte';
  import Pagination from '$lib/components/Pagination.svelte';

  export let data;

  const newestQuizzes = Array.isArray(data?.newest) ? data.newest : [];
  const categorySections = Array.isArray(data?.categories)
    ? data.categories.filter((section) => Array.isArray(section?.quizzes) && section.quizzes.length > 0)
    : [];

  const pagination = data?.pagination ?? null;

  const hasNewest = newestQuizzes.length > 0;
</script>

<div class="home-page">
  {#if hasNewest}
    <section class="home-section" aria-labelledby="newest-heading" id="newest-quizzes">
      <h2 class="section-title" id="newest-heading">新着クイズ</h2>
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

  {#if categorySections.length}
    <section class="home-section" aria-labelledby="category-heading">
      <header class="section-header">
        <h2 id="category-heading">
          <SectionIcon name="home-icon" className="section-icon" /> カテゴリ別クイズ
        </h2>
        <p>得意なジャンルを選んで、レベルに合わせて問題を探しましょう。</p>
      </header>
      <div class="category-grid">
        {#each categorySections as section (section.slug)}
          <article class="category-card">
            <header class="category-card__header">
              <h3>{section.title}</h3>
              <p>{section.overview}</p>
              <p class="category-card__count">公開中 {section.quizCount}問</p>
            </header>
            <ArticleGrid minWidth={200} gap={16}>
              {#each section.quizzes.slice(0, 3) as quiz (quiz.slug)}
                <ArticleCard {quiz} />
              {/each}
            </ArticleGrid>
            <div class="category-card__footer">
              <a class="category-link" href={`/category/${section.slug}`}>カテゴリのクイズをもっと見る</a>
            </div>
          </article>
        {/each}
      </div>
    </section>
  {/if}
</div>

<style>
  .home-section {
    margin-bottom: 3rem;
    display: grid;
    gap: 1.5rem;
  }

  .section-title {
    font-size: clamp(1.8rem, 3vw, 2.2rem);
    font-weight: 700;
    color: #2d3436;
    padding-bottom: 0.6rem;
    border-bottom: 3px solid rgba(255, 193, 7, 0.65);
    margin: 0;
  }

  .section-header {
    display: grid;
    gap: 0.75rem;
  }

  .section-header h2 {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: clamp(1.6rem, 2.8vw, 2rem);
    font-weight: 700;
    color: #2d3436;
    margin: 0;
  }

  .section-header p {
    margin: 0;
    color: #555d65;
    line-height: 1.7;
    font-size: 0.95rem;
  }

  .home-page {
    display: flex;
    flex-direction: column;
    gap: 3rem;
  }

  :global(.section-icon) {
    width: 28px;
    height: 28px;
  }

  .category-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .category-card {
    background: #ffffff;
    border-radius: 24px;
    padding: 1.75rem;
    display: grid;
    gap: 1.25rem;
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
    border: 1px solid rgba(248, 196, 113, 0.28);
  }

  .category-card__header {
    display: grid;
    gap: 0.5rem;
  }

  .category-card__header h3 {
    margin: 0;
    font-size: 1.4rem;
    color: #78350f;
    font-weight: 700;
  }

  .category-card__header p {
    margin: 0;
    color: #92400e;
    line-height: 1.6;
  }

  .category-card__count {
    font-size: 0.95rem;
    font-weight: 700;
    color: #b45309;
  }

  .category-card__footer {
    display: flex;
    justify-content: flex-end;
  }

  .category-link {
    text-decoration: none;
    font-weight: 700;
    color: #92400e;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.6rem 1.2rem;
    border-radius: 999px;
    background: rgba(254, 243, 199, 0.8);
    box-shadow: 0 10px 20px rgba(249, 115, 22, 0.16);
  }

  .category-link::after {
    content: '→';
    font-size: 1.1rem;
  }

  .category-link:hover,
  .category-link:focus-visible {
    background: rgba(254, 215, 170, 0.9);
  }

  @media (max-width: 768px) {
    .category-grid {
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    }
  }

  @media (max-width: 520px) {
    .section-title {
      font-size: 1.6rem;
    }

    .category-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
