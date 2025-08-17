<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { client } from '$lib/sanity.js';

  let quiz = null;
  let loading = true;
  let error = null;
  let showHint = false;
  let showAnswer = false;

  onMount(async () => {
    try {
      const slug = $page.params.slug;
      
      // スラッグまたはIDでクイズを検索
      const query = `*[_type == "quiz" && (slug.current == $slug || _id == $slug)][0] {
        _id,
        title,
        slug,
        mainImage {
          asset->{
            _id,
            url
          }
        },
        problemDescription,
        hint,
        answerImage {
          asset->{
            _id,
            url
          }
        },
        answerExplanation,
        closingMessage,
        category->{
          title,
          description
        }
      }`;
      
      const result = await client.fetch(query, { slug });
      
      if (result) {
        quiz = result;
      } else {
        error = 'クイズが見つかりませんでした';
      }
      loading = false;
    } catch (err) {
      console.error('クイズデータの取得に失敗:', err);
      error = err.message;
      loading = false;
    }
  });

  function toggleHint() {
    showHint = !showHint;
  }

  function toggleAnswer() {
    showAnswer = !showAnswer;
  }

  function renderPortableText(blocks) {
    if (!blocks || !Array.isArray(blocks)) return '';
    return blocks
      .filter(block => block._type === 'block')
      .map(block => 
        block.children
          ?.filter(child => child._type === 'span')
          ?.map(child => child.text)
          ?.join('') || ''
      )
      .join('\n');
  }
</script>

<svelte:head>
  <title>{quiz?.title || 'クイズ'} - 脳トレ日和</title>
  <meta name="description" content={quiz?.title ? `${quiz.title}に挑戦しましょう。` : 'クイズに挑戦しましょう。'} />
</svelte:head>

<main>
  {#if loading}
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>クイズを読み込み中...</p>
    </div>
  {:else if error}
    <div class="error-container">
      <h2>⚠️ エラーが発生しました</h2>
      <p>{error}</p>
      <a href="/quiz" class="back-button">← クイズ一覧に戻る</a>
    </div>
  {:else if quiz}
    <article class="quiz-article">
      <!-- ヘッダー -->
      <header class="quiz-header">
        <div class="breadcrumb">
          <a href="/quiz">← クイズ一覧</a>
        </div>
        
        {#if quiz.category}
          <div class="category-tag">
            {quiz.category.title}
          </div>
        {/if}
        
        <h1 class="quiz-title">{quiz.title}</h1>
      </header>

      <!-- 問題セクション -->
      <section class="problem-section">
        <h2 class="section-title">🎯 問題</h2>
        
        {#if quiz.mainImage?.asset?.url}
          <div class="quiz-image">
            <img 
              src={quiz.mainImage.asset.url}
              alt="問題画像"
              loading="lazy"
            />
          </div>
        {/if}
        
        {#if quiz.problemDescription}
          <div class="problem-text">
            {renderPortableText(quiz.problemDescription)}
          </div>
        {/if}
      </section>

      <!-- ヒントセクション -->
      {#if quiz.hint}
        <section class="hint-section">
          <button class="hint-button" on:click={toggleHint}>
            💡 ヒントを{showHint ? '隠す' : '見る'}
          </button>
          
          {#if showHint}
            <div class="hint-content">
              <h3>💡 ヒント</h3>
              <p>{renderPortableText(quiz.hint)}</p>
            </div>
          {/if}
        </section>
      {/if}

      <!-- 正解セクション -->
      <section class="answer-section">
        <button class="answer-button" on:click={toggleAnswer}>
          ✅ 正解を{showAnswer ? '隠す' : '見る'}
        </button>
        
        {#if showAnswer}
          <div class="answer-content">
            <h3>✅ 正解</h3>
            
            {#if quiz.answerImage?.asset?.url}
              <div class="answer-image">
                <img 
                  src={quiz.answerImage.asset.url}
                  alt="正解画像"
                  loading="lazy"
                />
              </div>
            {/if}
            
            {#if quiz.answerExplanation}
              <div class="answer-explanation">
                <h4>📝 解説</h4>
                <p>{renderPortableText(quiz.answerExplanation)}</p>
              </div>
            {/if}
            
            {#if quiz.closingMessage}
              <div class="closing-message">
                <p>{renderPortableText(quiz.closingMessage)}</p>
              </div>
            {/if}
          </div>
        {/if}
      </section>

      <!-- ナビゲーション -->
      <nav class="quiz-nav">
        <a href="/quiz" class="nav-button">← クイズ一覧に戻る</a>
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

  .quiz-article {
    background: var(--white);
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .quiz-header {
    padding: 2rem;
    background: linear-gradient(135deg, var(--primary-yellow) 0%, var(--primary-amber) 100%);
    color: #856404;
  }

  .breadcrumb {
    margin-bottom: 1rem;
  }

  .breadcrumb a {
    color: #856404;
    text-decoration: none;
    font-weight: 500;
  }

  .breadcrumb a:hover {
    text-decoration: underline;
  }

  .category-tag {
    background: rgba(255, 255, 255, 0.9);
    color: #856404;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 500;
    display: inline-block;
    margin-bottom: 1rem;
  }

  .quiz-title {
    font-size: 1.75rem;
    font-weight: 700;
    line-height: 1.3;
    margin: 0;
  }

  .problem-section,
  .hint-section,
  .answer-section {
    padding: 2rem;
    border-bottom: 1px solid var(--light-gray);
  }

  .section-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--dark-gray);
    margin-bottom: 1.5rem;
  }

  .quiz-image,
  .answer-image {
    margin: 1.5rem 0;
    text-align: center;
  }

  .quiz-image img,
  .answer-image img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }

  .problem-text {
    font-size: 1.1rem;
    line-height: 1.7;
    color: var(--dark-gray);
    white-space: pre-line;
  }

  .hint-button,
  .answer-button {
    background: var(--primary-yellow);
    color: #856404;
    border: none;
    padding: 1rem 2rem;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    width: 100%;
    margin-bottom: 1rem;
  }

  .hint-button:hover,
  .answer-button:hover {
    background: var(--primary-amber);
    transform: translateY(-2px);
  }

  .hint-content,
  .answer-content {
    background: #f8f9fa;
    padding: 1.5rem;
    border-radius: 8px;
    border-left: 4px solid var(--primary-yellow);
  }

  .hint-content h3,
  .answer-content h3 {
    color: var(--dark-gray);
    margin-bottom: 1rem;
  }

  .hint-content p,
  .answer-explanation p,
  .closing-message p {
    line-height: 1.7;
    color: var(--dark-gray);
    white-space: pre-line;
  }

  .answer-explanation {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--light-gray);
  }

  .answer-explanation h4 {
    color: var(--dark-gray);
    margin-bottom: 1rem;
  }

  .closing-message {
    margin-top: 1.5rem;
    padding: 1rem;
    background: var(--primary-yellow);
    border-radius: 8px;
    color: #856404;
    font-weight: 500;
  }

  .quiz-nav {
    padding: 2rem;
    text-align: center;
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
    .hint-section,
    .answer-section,
    .quiz-nav {
      padding: 1.5rem;
    }

    .quiz-title {
      font-size: 1.5rem;
    }

    .section-title {
      font-size: 1.3rem;
    }

    .hint-button,
    .answer-button {
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
    }
  }
</style>

