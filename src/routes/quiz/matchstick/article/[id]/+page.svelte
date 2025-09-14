<script>
  export let data;
  import { urlFor } from '$lib/sanityPublic.js';
  let { quiz } = data;
  let error = null;
  let showHint = false;

  function toggleHint() {
    showHint = !showHint;
  }

  function renderPortableText(content) {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return '';
    
    return content
      .filter(block => block._type === 'block')
      .map(block => 
        block.children
          ?.filter(child => child._type === 'span')
          ?.map(child => child.text)
          ?.join('') || ''
      )
      .join('\n');
  }

  function getImageUrl(imageRef) {
    if (!imageRef) return '';
    if (typeof imageRef === 'string') return imageRef;
    if (imageRef.asset && imageRef.asset.url) return imageRef.asset.url;
    if (imageRef.asset && imageRef.asset._ref) {
      try { return urlFor(imageRef).width(900).url(); } catch { return ''; }
    }
    return '';
  }

  // タイトルを改行で分割
  function formatTitle(title) {
    if (!title) return '';
    return title.replace('【マッチ棒クイズ】', '【マッチ棒クイズ】<br>');
  }
</script>

<svelte:head>
  <title>{quiz?.title || 'クイズ'} - 脳トレ日和</title>
  <meta name="description" content={quiz?.title ? `${quiz.title}に挑戦しましょう。` : 'クイズに挑戦しましょう。'} />
</svelte:head>

<main>
  {#if quiz}
    <article class="quiz-article">
      <!-- ヘッダー -->
      <header class="quiz-header">
        <div class="breadcrumb">
          <a href="/quiz">← クイズ一覧</a>
        </div>
        
        <div class="category-tag">
          マッチ棒クイズ
        </div>
        
        <h1 class="quiz-title">{@html formatTitle(quiz.title)}</h1>
      </header>

      <!-- 問題セクション -->
      <section class="problem-section">
        <h2 class="section-title">問題</h2>
        
        {#if getImageUrl(quiz.mainImage)}
          <div class="quiz-image">
            <img 
              src={getImageUrl(quiz.mainImage)}
              alt="問題画像"
              loading="lazy"
            />
          </div>
        {/if}
        
        <div class="problem-text">
          {renderPortableText(quiz.problemDescription) || quiz.problemDescription || 'マッチ棒1本だけを別の場所へ移動して、式「9＋1＝8」を正しい等式に直してください。画像の中で"どの1本を動かすか"がポイントです。'}
        </div>
      </section>

      <!-- ヒントセクション -->
      <section class="hint-section">
        <button class="hint-button" on:click={toggleHint}>
          ヒントを{showHint ? '隠す' : '見る'}
        </button>
        
        {#if showHint}
          <div class="hint-content">
            <h3>ヒント</h3>
            <p>{renderPortableText(quiz.hint) || quiz.hint || 'まず右側の数字を観察。その下半分に、動かせそうな"余裕のある1本"があります。見つけた1本を左側の数字に移すと形が整います。'}</p>
          </div>
        {/if}
      </section>

      <!-- 正解ページへのナビゲーション -->
      <section class="answer-navigation">
        <a href="/quiz/matchstick/article/{quiz._id}/answer" class="answer-link">
        </a>
      </section>


    </article>
  {:else}
    <div class="error-container">
      <h2>クイズが見つかりませんでした</h2>
      <a href="/quiz" class="back-button">← クイズ一覧に戻る</a>
    </div>
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
  .answer-navigation {
    padding: 2rem;
    border-bottom: 1px solid var(--light-gray);
  }

  .section-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--dark-gray);
    margin-bottom: 1.5rem;
    text-align: center;
  }

  .quiz-image {
    margin: 1.5rem 0;
    text-align: center;
  }

  .quiz-image img {
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
    text-align: center;
  }

  .hint-button {
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

  .hint-button:hover {
    background: var(--primary-amber);
    transform: translateY(-2px);
  }

  .hint-content {
    background: #f8f9fa;
    padding: 1.5rem;
    border-radius: 8px;
    border-left: 4px solid var(--primary-yellow);
  }

  .hint-content h3 {
    color: var(--dark-gray);
    margin-bottom: 1rem;
  }

  .hint-content p {
    line-height: 1.7;
    color: var(--dark-gray);
    white-space: pre-line;
  }

  .answer-navigation {
    text-align: center;
  }

  .answer-link {
    background: var(--primary-yellow);
    color: #856404;
    text-decoration: none;
    padding: 1rem 2rem;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 600;
    transition: all 0.3s ease;
    display: inline-block;
  }

  .answer-link:hover {
    background: var(--primary-amber);
    transform: translateY(-2px);
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
    .answer-navigation,
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
    .answer-link {
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
    }
  }
</style>
