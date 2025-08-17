<script>
  import { onMount } from 'svelte';
  import { client } from '$lib/sanity.js';

  let quizzes = [];
  let loading = true;
  let error = null;

  onMount(async () => {
    try {
      // スキーマなしで全ドキュメントから quiz タイプのみを取得
      const query = `*[_type == "quiz"]`;
      
      const result = await client.fetch(query);
      console.log('取得したクイズデータ:', result);
      quizzes = result;
      loading = false;
    } catch (err) {
      console.error('クイズデータの取得に失敗:', err);
      error = err.message;
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>クイズ一覧 - 脳トレ日和</title>
  <meta name="description" content="脳トレ日和のクイズ一覧ページです。マッチ棒クイズや間違い探しなど、楽しいクイズに挑戦しましょう。" />
</svelte:head>

<main>
  <div class="section-header">
    <h1 class="section-title">🧩 クイズ一覧</h1>
  </div>

  {#if loading}
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>クイズを読み込み中...</p>
    </div>
  {:else if error}
    <div class="error-container">
      <h2>⚠️ データ読み込みエラー</h2>
      <p>クイズデータの読み込みに失敗しました。</p>
      <p class="error-detail">{error}</p>
      <button on:click={() => window.location.reload()} class="retry-button">再読み込み</button>
    </div>
  {:else if quizzes.length === 0}
    <div class="no-content">
      <h2>📝 クイズ準備中</h2>
      <p>現在、新しいクイズを準備しております。もうしばらくお待ちください。</p>
    </div>
  {:else}
    <div class="quiz-grid">
      {#each quizzes as quiz}
        <article class="quiz-card">
          <a href="/quiz/{quiz._id}" class="quiz-link">
            <div class="quiz-content">
              <h2 class="quiz-title">{quiz.title || 'タイトル未設定'}</h2>
              
              <div class="quiz-category">
                <span class="category-tag">マッチ棒クイズ</span>
              </div>
              
              <p class="quiz-description">
                マッチ棒1本だけを動かして正しい式に直してください。
              </p>
              
              <div class="quiz-meta">
                <span class="quiz-type">🧩 クイズ</span>
                <span class="quiz-action">挑戦する →</span>
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

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 50vh;
    gap: 1rem;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--light-gray);
    border-top: 4px solid var(--primary-yellow);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error-container {
    text-align: center;
    padding: 2rem;
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 8px;
    margin: 2rem 0;
  }

  .error-detail {
    font-size: 0.9rem;
    color: var(--medium-gray);
    margin: 1rem 0;
    word-break: break-all;
  }

  .retry-button {
    background: var(--primary-yellow);
    color: #856404;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.3s ease;
  }

  .retry-button:hover {
    background: var(--primary-amber);
    transform: translateY(-2px);
  }

  .no-content {
    text-align: center;
    padding: 3rem 2rem;
    background: var(--white);
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    margin: 2rem 0;
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

  .quiz-content {
    padding: 1.5rem;
  }

  .quiz-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--dark-gray);
    margin-bottom: 1rem;
    line-height: 1.4;
  }

  .quiz-category {
    margin-bottom: 1rem;
  }

  .category-tag {
    background: var(--primary-yellow);
    color: #856404;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 500;
  }

  .quiz-description {
    color: var(--medium-gray);
    line-height: 1.6;
    margin-bottom: 1.5rem;
  }

  .quiz-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.9rem;
  }

  .quiz-type {
    color: var(--medium-gray);
  }

  .quiz-action {
    color: var(--primary-yellow);
    font-weight: 500;
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
  }
</style>

