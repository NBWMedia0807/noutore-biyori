<script>
  import { onMount } from 'svelte';
  import { getQuizzes, urlFor } from '$lib/sanity.js';

  let quizzes = [];
  let loading = true;
  let error = null;

  onMount(async () => {
    try {
      quizzes = await getQuizzes();
      loading = false;
    } catch (err) {
      error = err.message;
      loading = false;
    }
  });

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function getDifficultyText(difficulty) {
    const difficultyMap = {
      easy: '★☆☆',
      medium: '★★☆',
      hard: '★★★'
    };
    return difficultyMap[difficulty] || '★☆☆';
  }

  function getDifficultyClass(difficulty) {
    return `difficulty-${difficulty}`;
  }
</script>

<svelte:head>
  <title>クイズ一覧 - 脳トレ日和</title>
  <meta name="description" content="脳トレ日和のクイズ一覧ページです。マッチ棒クイズや間違い探しなど、様々なクイズに挑戦できます。" />
</svelte:head>

<main>
  <div class="section-header">
    <h1 class="section-title">🧩 クイズ一覧</h1>
  </div>

  {#if loading}
    <div class="loading-container">
      <div class="spinner"></div>
      <p>クイズを読み込み中...</p>
    </div>
  {:else if error}
    <div class="error-container">
      <h2>エラーが発生しました</h2>
      <p>{error}</p>
      <button on:click={() => window.location.reload()}>再読み込み</button>
    </div>
  {:else if quizzes.length === 0}
    <div class="empty-container">
      <h2>クイズがありません</h2>
      <p>現在、表示できるクイズがありません。</p>
    </div>
  {:else}
    <div class="quiz-grid">
      {#each quizzes as quiz}
        <article class="quiz-card">
          <a href="/quiz/{quiz.slug.current}" class="quiz-link">
            <div class="quiz-image">
              {#if quiz.mainImage}
                <img 
                  src={urlFor(quiz.mainImage).width(400).height(300).url()} 
                  alt={quiz.title}
                  loading="lazy"
                />
              {:else}
                <div class="no-image">
                  <span>🧩</span>
                </div>
              {/if}
            </div>
            
            <div class="quiz-content">
              <div class="quiz-meta">
                <span class="quiz-date">{formatDate(quiz.publishedAt)}</span>
                {#if quiz.category}
                  <span class="quiz-category">{quiz.category.title}</span>
                {/if}
              </div>
              
              <h2 class="quiz-title">{quiz.title}</h2>
              
              <div class="quiz-difficulty">
                <span class="difficulty-label">難易度:</span>
                <span class="difficulty-stars {getDifficultyClass(quiz.difficulty)}">
                  {getDifficultyText(quiz.difficulty)}
                </span>
              </div>
            </div>
          </a>
        </article>
      {/each}
    </div>
  {/if}
</main>

<style>
  main {
    max-width: 1000px;
    margin: 0 auto;
    padding: 1rem;
  }

  .loading-container,
  .error-container,
  .empty-container {
    text-align: center;
    padding: 3rem 1rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--light-amber);
    border-top: 4px solid var(--primary-yellow);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .quiz-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 2rem;
    margin-top: 2rem;
  }

  .quiz-card {
    background: var(--white);
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    transition: all 0.3s ease;
    border-left: 4px solid var(--primary-yellow);
  }

  .quiz-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  }

  .quiz-link {
    text-decoration: none;
    color: inherit;
    display: block;
  }

  .quiz-image {
    width: 100%;
    height: 200px;
    overflow: hidden;
    background: var(--light-yellow);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .quiz-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  .quiz-card:hover .quiz-image img {
    transform: scale(1.05);
  }

  .no-image {
    font-size: 3rem;
    color: var(--primary-amber);
  }

  .quiz-content {
    padding: 1.5rem;
  }

  .quiz-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }

  .quiz-date {
    color: var(--medium-gray);
  }

  .quiz-category {
    background: var(--primary-yellow);
    color: #856404;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-weight: 500;
  }

  .quiz-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--dark-gray);
    margin-bottom: 1rem;
    line-height: 1.4;
  }

  .quiz-difficulty {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .difficulty-label {
    font-size: 0.875rem;
    color: var(--medium-gray);
  }

  .difficulty-stars {
    font-size: 1rem;
    font-weight: bold;
  }

  .difficulty-easy {
    color: var(--easy-color);
  }

  .difficulty-medium {
    color: var(--medium-color);
  }

  .difficulty-hard {
    color: var(--hard-color);
  }

  .error-container button {
    background: var(--primary-yellow);
    color: #856404;
    border: none;
    border-radius: 8px;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    cursor: pointer;
    margin-top: 1rem;
    transition: all 0.3s ease;
  }

  .error-container button:hover {
    background: var(--primary-amber);
    transform: translateY(-2px);
  }

  /* レスポンシブデザイン */
  @media (max-width: 768px) {
    .quiz-grid {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    .quiz-content {
      padding: 1rem;
    }

    .quiz-title {
      font-size: 1.1rem;
    }

    .quiz-meta {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
  }
</style>

