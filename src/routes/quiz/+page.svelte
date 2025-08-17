<script>
  import { onMount } from 'svelte';
  import { client } from '$lib/sanity.js';

  let quizzes = [];
  let loading = true;
  let error = null;

  onMount(async () => {
    try {
      // 最もシンプルなクエリで全ドキュメントを取得
      const result = await client.fetch('*');
      console.log('取得した全データ:', result);
      
      // quizタイプのドキュメントをフィルタリング
      const quizData = result.filter(doc => doc._type === 'quiz');
      
      if (quizData && quizData.length > 0) {
        quizzes = quizData;
        console.log('フィルタリングしたクイズデータ:', quizzes);
      } else {
        // データが見つからない場合は、手動でサンプルデータを表示
        quizzes = [{
          _id: 'sample-quiz',
          _type: 'quiz',
          title: '【マッチ棒クイズ】1本だけ動かして正しい式に：9＋1＝8？'
        }];
      }
      loading = false;
    } catch (err) {
      console.error('データの取得に失敗:', err);
      // エラーの場合もサンプルデータを表示
      quizzes = [{
        _id: 'sample-quiz',
        _type: 'quiz',
        title: '【マッチ棒クイズ】1本だけ動かして正しい式に：9＋１＝8？'
      }];
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
  {:else}
    <div class="quiz-grid">
      {#each quizzes as quiz}
        <article class="quiz-card">
          <a href="/quiz/{quiz._id}" class="quiz-link">
            <div class="quiz-content">
              <h2 class="quiz-title">{quiz.title || '【マッチ棒クイズ】1本だけ動かして正しい式に：9＋１＝8？'}</h2>
              
              <div class="quiz-category">
                <span class="category-tag">マッチ棒クイズ</span>
              </div>
              
              <p class="quiz-description">
                マッチ棒1本だけを動かして正しい式に直してください。頭の体操にぴったりです！
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

  .section-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .section-title {
    font-size: 2rem;
    font-weight: 700;
    color: var(--dark-gray);
    margin: 0;
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

    .section-title {
      font-size: 1.5rem;
    }
  }
</style>

