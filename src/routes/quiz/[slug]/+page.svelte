<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { client } from '$lib/sanity.js';

  let quiz = null;
  let loading = true;
  let error = null;
  let showHint = false;
  let showAnswer = false;

  // サンプルデータ
  const sampleQuiz = {
    _id: 'sample-quiz',
    _type: 'quiz',
    title: '【マッチ棒クイズ】1本だけ動かして正しい式に：9＋１＝8？',
    mainImage: {
      asset: {
        url: '/matchstick_question_0817.png'
      }
    },
    problemDescription: 'マッチ棒1本だけを別の場所へ移動して、式「9＋1＝8」を正しい等式に直してください。画像の中で"どの1本を動かすか"がポイントです。',
    hint: 'まず右側の数字を観察。その下半分に、動かせそうな"余裕のある1本"があります。見つけた1本を左側の数字に移すと形が整います。',
    answerImage: {
      asset: {
        url: '/matchstick_answer_0817.png'
      }
    },
    answerExplanation: '右の「8」から左下の縦1本を抜き、それを左の「9」の左下に移します。よって式は 8＋1＝9 となり、正解です。',
    closingMessage: 'このシリーズは毎日更新。明日も新作を公開します。ブックマークしてまた挑戦してください！'
  };

  onMount(async () => {
    try {
      const slug = $page.params.slug;
      
      // まずSanityからデータを取得を試行
      const result = await client.fetch(`*[_id == $id][0]`, { id: slug });
      
      if (result && result._type === 'quiz') {
        quiz = result;
        console.log('Sanityから取得したクイズ:', quiz);
      } else {
        // Sanityからデータが取得できない場合はサンプルデータを使用
        quiz = sampleQuiz;
        console.log('サンプルデータを使用:', quiz);
      }
      loading = false;
    } catch (err) {
      console.error('クイズデータの取得に失敗:', err);
      // エラーの場合もサンプルデータを使用
      quiz = sampleQuiz;
      loading = false;
    }
  });

  function toggleHint() {
    showHint = !showHint;
  }

  function toggleAnswer() {
    showAnswer = !showAnswer;
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
    if (!imageRef) return null;
    if (typeof imageRef === 'string') return imageRef;
    if (imageRef.asset && imageRef.asset.url) return imageRef.asset.url;
    if (imageRef.asset && imageRef.asset._ref) {
      // Sanity画像URLを構築
      const ref = imageRef.asset._ref;
      const [, id, dimensions, format] = ref.match(/^image-([a-f\d]+)-(\d+x\d+)-(\w+)$/) || [];
      if (id && dimensions && format) {
        return `https://cdn.sanity.io/images/dxl04rd4/production/${id}-${dimensions}.${format}`;
      }
    }
    return null;
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
  {:else if quiz}
    <article class="quiz-article">
      <!-- ヘッダー -->
      <header class="quiz-header">
        <div class="breadcrumb">
          <a href="/quiz">← クイズ一覧</a>
        </div>
        
        <div class="category-tag">
          マッチ棒クイズ
        </div>
        
        <h1 class="quiz-title">{quiz.title}</h1>
      </header>

      <!-- 問題セクション -->
      <section class="problem-section">
        <h2 class="section-title">🎯 問題</h2>
        
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
          💡 ヒントを{showHint ? '隠す' : '見る'}
        </button>
        
        {#if showHint}
          <div class="hint-content">
            <h3>💡 ヒント</h3>
            <p>{renderPortableText(quiz.hint) || quiz.hint || 'まず右側の数字を観察。その下半分に、動かせそうな"余裕のある1本"があります。見つけた1本を左側の数字に移すと形が整います。'}</p>
          </div>
        {/if}
      </section>

      <!-- 正解セクション -->
      <section class="answer-section">
        <button class="answer-button" on:click={toggleAnswer}>
          ✅ 正解を{showAnswer ? '隠す' : '見る'}
        </button>
        
        {#if showAnswer}
          <div class="answer-content">
            <h3>✅ 正解</h3>
            
            {#if getImageUrl(quiz.answerImage)}
              <div class="answer-image">
                <img 
                  src={getImageUrl(quiz.answerImage)}
                  alt="正解画像"
                  loading="lazy"
                />
              </div>
            {/if}
            
            <div class="answer-explanation">
              <h4>📝 解説</h4>
              <p>{renderPortableText(quiz.answerExplanation) || quiz.answerExplanation || '右の「8」から左下の縦1本を抜き、それを左の「9」の左下に移します。よって式は 8＋1＝9 となり、正解です。'}</p>
            </div>
            
            <div class="closing-message">
              <p>{renderPortableText(quiz.closingMessage) || quiz.closingMessage || 'このシリーズは毎日更新。明日も新作を公開します。ブックマークしてまた挑戦してください！'}</p>
            </div>
          </div>
        {/if}
      </section>

      <!-- ナビゲーション -->
      <nav class="quiz-nav">
        <a href="/quiz" class="nav-button">← クイズ一覧に戻る</a>
      </nav>
    </article>
  {:else}
    <div class="error-container">
      <h2>⚠️ クイズが見つかりませんでした</h2>
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

