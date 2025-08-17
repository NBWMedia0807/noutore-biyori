<script>
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { getQuiz, urlFor } from '$lib/sanity.js';

  let quiz = null;
  let loading = true;
  let error = null;
  let showAnswer = false;

  onMount(async () => {
    try {
      const slug = $page.params.slug;
      quiz = await getQuiz(slug);
      if (!quiz) {
        error = 'クイズが見つかりませんでした';
      }
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

  function toggleAnswer() {
    showAnswer = !showAnswer;
    if (showAnswer) {
      // 正解表示時にページ下部にスクロール
      setTimeout(() => {
        const answerSection = document.getElementById('answer-section');
        if (answerSection) {
          answerSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }

  function renderBlockContent(blocks) {
    if (!blocks || !Array.isArray(blocks)) return '';
    
    return blocks.map(block => {
      if (block._type === 'block') {
        const text = block.children?.map(child => child.text).join('') || '';
        return `<p>${text}</p>`;
      }
      return '';
    }).join('');
  }
</script>

<svelte:head>
  {#if quiz}
    <title>{quiz.title} - 脳トレ日和</title>
    <meta name="description" content={quiz.title} />
  {:else}
    <title>クイズ - 脳トレ日和</title>
  {/if}
</svelte:head>

<main>
  {#if loading}
    <div class="loading-container">
      <div class="spinner"></div>
      <p>クイズを読み込み中...</p>
    </div>
  {:else if error}
    <div class="error-container">
      <h2>エラーが発生しました</h2>
      <p>{error}</p>
      <a href="/quiz" class="back-button">クイズ一覧に戻る</a>
    </div>
  {:else if quiz}
    <article class="quiz-article">
      <!-- クイズヘッダー -->
      <header class="quiz-header">
        <div class="quiz-meta">
          <span class="quiz-date">{formatDate(quiz.publishedAt)}</span>
          {#if quiz.category}
            <span class="quiz-category">{quiz.category.title}</span>
          {/if}
        </div>
        
        <h1 class="quiz-title">{quiz.title}</h1>
        
        <div class="quiz-difficulty">
          <span class="difficulty-label">難易度:</span>
          <span class="difficulty-stars difficulty-{quiz.difficulty}">
            {getDifficultyText(quiz.difficulty)}
          </span>
        </div>
      </header>

      <!-- 問題セクション -->
      <section class="problem-section">
        {#if quiz.mainImage}
          <div class="problem-image">
            <img 
              src={urlFor(quiz.mainImage).width(800).height(600).url()} 
              alt="問題画像"
            />
          </div>
        {/if}

        {#if quiz.problemDescription}
          <div class="problem-description">
            {@html renderBlockContent(quiz.problemDescription)}
          </div>
        {/if}

        {#if quiz.hint && !showAnswer}
          <details class="hint-section">
            <summary>💡 ヒントを見る</summary>
            <div class="hint-content">
              {@html renderBlockContent(quiz.hint)}
            </div>
          </details>
        {/if}

        <div class="action-section">
          {#if !showAnswer}
            <button class="answer-button" on:click={toggleAnswer}>
              🎯 正解を見る
            </button>
          {:else}
            <button class="answer-button secondary" on:click={toggleAnswer}>
              📝 問題に戻る
            </button>
          {/if}
        </div>
      </section>

      <!-- 正解セクション -->
      {#if showAnswer}
        <section class="answer-section" id="answer-section">
          <h2 class="answer-title">🎉 正解発表</h2>
          
          {#if quiz.answerImage}
            <div class="answer-image">
              <img 
                src={urlFor(quiz.answerImage).width(800).height(600).url()} 
                alt="正解画像"
              />
            </div>
          {/if}

          {#if quiz.answerExplanation}
            <div class="answer-explanation">
              {@html renderBlockContent(quiz.answerExplanation)}
            </div>
          {/if}

          {#if quiz.closingMessage}
            <div class="closing-message">
              {@html renderBlockContent(quiz.closingMessage)}
            </div>
          {/if}
        </section>
      {/if}

      <!-- ナビゲーション -->
      <nav class="quiz-navigation">
        <a href="/quiz" class="nav-button">
          ← クイズ一覧に戻る
        </a>
        <a href="/" class="nav-button">
          🏠 ホームに戻る
        </a>
      </nav>
    </article>
  {/if}
</main>

<style>
  main {
    max-width: 800px;
    margin: 0 auto;
    padding: 1rem;
  }

  .loading-container,
  .error-container {
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

  .quiz-article {
    background: var(--white);
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    margin-bottom: 2rem;
  }

  .quiz-header {
    padding: 2rem;
    background: var(--light-yellow);
    border-bottom: 1px solid var(--light-amber);
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
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--dark-gray);
    margin-bottom: 1rem;
    line-height: 1.3;
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
    font-size: 1.1rem;
    font-weight: bold;
  }

  .difficulty-easy { color: var(--easy-color); }
  .difficulty-medium { color: var(--medium-color); }
  .difficulty-hard { color: var(--hard-color); }

  .problem-section,
  .answer-section {
    padding: 2rem;
  }

  .problem-image,
  .answer-image {
    text-align: center;
    margin-bottom: 2rem;
  }

  .problem-image img,
  .answer-image img {
    max-width: 100%;
    height: auto;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }

  .problem-description,
  .answer-explanation,
  .closing-message {
    font-size: 1.1rem;
    line-height: 1.7;
    color: var(--dark-gray);
    margin-bottom: 2rem;
  }

  .problem-description :global(p),
  .answer-explanation :global(p),
  .closing-message :global(p) {
    margin-bottom: 1rem;
  }

  .hint-section {
    background: var(--light-amber);
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 2rem;
    border-left: 4px solid var(--primary-amber);
  }

  .hint-section summary {
    font-weight: 600;
    color: #92400e;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 8px;
    transition: background-color 0.3s ease;
  }

  .hint-section summary:hover {
    background: rgba(245, 158, 11, 0.2);
  }

  .hint-content {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(245, 158, 11, 0.3);
  }

  .action-section {
    text-align: center;
    margin-bottom: 2rem;
  }

  .answer-button {
    background: var(--primary-yellow);
    color: #856404;
    border: none;
    border-radius: 12px;
    padding: 1rem 2rem;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(255, 193, 7, 0.3);
  }

  .answer-button:hover {
    background: var(--primary-amber);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 193, 7, 0.4);
  }

  .answer-button.secondary {
    background: var(--light-gray);
    color: var(--dark-gray);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }

  .answer-button.secondary:hover {
    background: #e5e7eb;
  }

  .answer-section {
    background: var(--light-yellow);
    border-top: 2px solid var(--primary-yellow);
  }

  .answer-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--dark-gray);
    margin-bottom: 2rem;
    text-align: center;
  }

  .closing-message {
    background: var(--light-amber);
    border-radius: 12px;
    padding: 1.5rem;
    border-left: 4px solid var(--primary-amber);
    font-style: italic;
  }

  .quiz-navigation {
    padding: 2rem;
    background: var(--light-gray);
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }

  .nav-button,
  .back-button {
    background: var(--primary-yellow);
    color: #856404;
    text-decoration: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 500;
    transition: all 0.3s ease;
    display: inline-block;
  }

  .nav-button:hover,
  .back-button:hover {
    background: var(--primary-amber);
    transform: translateY(-2px);
  }

  /* レスポンシブデザイン */
  @media (max-width: 768px) {
    .quiz-header,
    .problem-section,
    .answer-section {
      padding: 1.5rem;
    }

    .quiz-title {
      font-size: 1.4rem;
    }

    .quiz-meta {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .quiz-navigation {
      flex-direction: column;
      padding: 1.5rem;
    }

    .nav-button {
      text-align: center;
    }
  }
</style>

