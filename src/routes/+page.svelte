<script>
  import SectionIcon from '$lib/components/SectionIcon.svelte';
  import ArticleCard from '$lib/components/ArticleCard.svelte';
  import ArticleGrid from '$lib/components/ArticleGrid.svelte';

  export let data;

  const newestQuizzes = Array.isArray(data?.newest) ? data.newest : [];
  const popularQuizzes = Array.isArray(data?.popular) ? data.popular : [];
  const categorySections = Array.isArray(data?.categories)
    ? data.categories.filter((section) => Array.isArray(section?.quizzes) && section.quizzes.length > 0)
    : [];

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
    </section>
  {/if}

  {#if hasPopular}
    <section class="home-section" aria-labelledby="popular-heading">
      <header class="section-header">
        <h2 id="popular-heading">
          <SectionIcon name="trophy-icon" className="section-icon" /> 人気クイズ
        </h2>
        <p>多くのユーザーに遊ばれている定番のクイズを集めました。</p>
      </header>
      <ArticleGrid minWidth={240} gap={20}>
        {#each popularQuizzes as quiz (quiz.slug)}
          <ArticleCard {quiz} />
        {/each}
      </ArticleGrid>
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
</main>

<style>
  .home-page {
    display: flex;
    flex-direction: column;
    gap: 4rem;
    padding: 1.5rem 1.25rem 4rem;
  }

  .hero {
    max-width: 1100px;
    margin: 0 auto;
    background: linear-gradient(135deg, rgba(255, 249, 196, 0.8), rgba(255, 229, 143, 0.9));
    border-radius: 32px;
    padding: clamp(1.5rem, 3vw, 3rem);
    display: grid;
    gap: 2rem;
    align-items: center;
    box-shadow: 0 28px 60px rgba(249, 115, 22, 0.18);
  }

  .hero-content {
    display: grid;
    gap: 1rem;
  }

  .hero-content h1 {
    font-size: clamp(2rem, 5vw, 2.8rem);
    margin: 0;
    color: #78350f;
    font-weight: 800;
    line-height: 1.3;
  }

  .hero-content p {
    margin: 0;
    color: #7c2d12;
    line-height: 1.8;
    font-size: 1.05rem;
  }

  .hero-cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.9rem 2.5rem;
    border-radius: 999px;
    background: linear-gradient(135deg, #facc15, #f97316);
    color: #78350f;
    font-weight: 700;
    text-decoration: none;
    box-shadow: 0 18px 35px rgba(234, 88, 12, 0.22);
    width: fit-content;
  }

  .hero-cta:hover,
  .hero-cta:focus-visible {
    filter: brightness(1.03);
    transform: translateY(-2px);
    transition: transform 0.2s ease, filter 0.2s ease;
  }

  .hero-visual {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .hero-visual img {
    width: clamp(140px, 25vw, 200px);
    height: auto;
    filter: drop-shadow(0 18px 36px rgba(217, 119, 6, 0.35));
  }

  .home-section {
    max-width: 1100px;
    margin: 0 auto;
    display: grid;
    gap: 1.5rem;
  }

  .section-header {
    display: grid;
    gap: 0.5rem;
  }

  .section-header h2 {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    font-size: clamp(1.8rem, 3.5vw, 2.2rem);
    margin: 0;
    color: #78350f;
    font-weight: 800;
  }

  .section-header p {
    margin: 0;
    color: #92400e;
    font-size: 1rem;
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
    .home-page {
      gap: 3rem;
      padding: 1.25rem 1rem 3.5rem;
    }

    .hero {
      text-align: center;
    }

    .hero-content {
      align-items: center;
    }

    .hero-cta {
      margin: 0 auto;
    }

    .category-grid {
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    }
  }

  @media (max-width: 520px) {
    .hero {
      padding: 1.75rem;
    }

    .hero-content h1 {
      font-size: 1.9rem;
    }

    .section-header h2 {
      font-size: 1.6rem;
    }

    .category-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
