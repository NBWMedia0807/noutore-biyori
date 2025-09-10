<script>
  import { page } from '$app/stores';
  export let data;
  let quizzes = [];
  let categoryTitle = '';
  $: slug = $page.params.slug;

  $: quizzes = data?.quizzes ?? [];
  $: categoryTitle = data?.categoryTitle ?? '';

  function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  }

  function getImageUrl(image) {
    if (!image || !image.asset) return '/matchstick_question.png';
    if (image.asset.url) return image.asset.url;
    return '/matchstick_question.png';
  }
</script>

<svelte:head>
  <title>{categoryTitle} - 脳トレ日和</title>
  <meta name="description" content="{categoryTitle}の一覧ページです。楽しく脳を鍛える{categoryTitle}をお楽しみください。">
</svelte:head>

{#key slug}
  <!-- カテゴリヘッダー -->
  <section class="category-header" style="text-align:center;">
    <div class="category-info">
      <h1 class="category-title">{categoryTitle}</h1>
      <p class="category-description">
        {#if slug === 'matchstick'}
          マッチ棒を動かして正しい式を作るパズルゲームです。論理的思考力を鍛えましょう。
        {:else if slug === 'spot-the-difference'}
          2つの画像の違いを見つけるゲームです。観察力と集中力を鍛えましょう。
        {/if}
      </p>
      <div class="quiz-count">全{quizzes.length}問</div>
    </div>
  </section>

<!-- クイズ一覧 -->
<section class="quiz-list-section">
  {#if quizzes.length === 0}
    <div class="no-quizzes">
      <p>まだ{categoryTitle}が投稿されていません。</p>
      <p>新しいクイズをお楽しみに！</p>
    </div>
  {:else}
    <div class="quiz-grid">
      {#each quizzes as quiz}
        <article class="quiz-card">
          <a href="/quiz/{quiz.slug}" class="quiz-link">
            <div class="quiz-image">
              <img src="{getImageUrl(quiz.mainImage || quiz.answerImage)}" alt="{quiz.title}" class="quiz-img" loading="lazy" />
              <div class="quiz-category">{quiz.category?.title ?? categoryTitle}</div>
            </div>
            <div class="quiz-content">
              <div class="quiz-date">{formatDate(quiz._createdAt)}</div>
              <h3 class="quiz-title">{quiz.title}</h3>
            </div>
          </a>
        </article>
      {/each}
    </div>
  {/if}
  </section>
{/key}

<style>
  /* カテゴリヘッダー */
  .category-header {
    background: linear-gradient(135deg, var(--light-yellow) 0%, var(--light-amber) 100%);
    padding: 2rem 1rem;
    margin-bottom: 2rem;
    border-radius: 16px;
    text-align: center;
    box-shadow: 0 4px 20px rgba(255, 193, 7, 0.2);
  }

  .category-info {
    max-width: 800px;
    margin: 0 auto;
  }

  .category-title {
    font-size: 2.5rem;
    color: var(--dark-gray);
    margin-bottom: 1rem;
    font-weight: 700;
  }

  .category-description {
    font-size: 1.1rem;
    color: var(--medium-gray);
    line-height: 1.6;
    margin-bottom: 1rem;
  }

  .quiz-count {
    display: inline-block;
    background: var(--primary-yellow);
    color: #856404;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-weight: 600;
    font-size: 0.9rem;
  }

  /* クイズ一覧セクション */
  .quiz-list-section {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  /* 読み込み・エラー状態 */
  .loading, .no-quizzes {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--medium-gray);
    font-size: 1.1rem;
  }

  .no-quizzes p {
    margin-bottom: 0.5rem;
  }

  /* クイズグリッド */
  .quiz-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-bottom: 3rem;
  }

  /* クイズカード */
  .quiz-card {
    background: var(--white);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    border: 1px solid #e5e7eb;
  }

  .quiz-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  }

  .quiz-link {
    text-decoration: none;
    color: inherit;
    display: block;
  }

  /* クイズ画像 */
  .quiz-image {
    position: relative;
    width: 100%;
    height: 200px;
    overflow: hidden;
  }

  .quiz-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  .quiz-card:hover .quiz-img {
    transform: scale(1.05);
  }

  .quiz-category {
    position: absolute;
    top: 12px;
    right: 12px;
    background: rgba(255, 193, 7, 0.9);
    color: var(--dark-gray);
    padding: 0.4rem 0.8rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
    backdrop-filter: blur(4px);
  }

  /* クイズコンテンツ */
  .quiz-content {
    padding: 1.5rem;
  }

  .quiz-date {
    color: var(--medium-gray);
    font-size: 0.9rem;
    margin-bottom: 0.8rem;
  }

  .quiz-title {
    font-size: 1.2rem;
    color: var(--dark-gray);
    line-height: 1.4;
    margin: 0;
    font-weight: 600;
  }

  /* レスポンシブ */
  @media (max-width: 768px) {
    .category-title {
      font-size: 2rem;
    }

    .category-description {
      font-size: 1rem;
    }

    .quiz-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .quiz-image {
      height: 180px;
    }

    .quiz-content {
      padding: 1.2rem;
    }

    .quiz-title {
      font-size: 1.1rem;
    }
  }

  @media (max-width: 480px) {
    .category-header {
      padding: 1.5rem 1rem;
    }

    .quiz-image {
      height: 160px;
    }
  }
</style>
