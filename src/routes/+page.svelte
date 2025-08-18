<script>
  import { onMount } from 'svelte';
  import { client } from '../lib/sanity.js';

  let quizzes = [];
  let loading = true;

  onMount(async () => {
    try {
      // 実際のデータ構造に合わせたクエリ
      const query = `*[_type == "quiz"] | order(_createdAt desc)[0...10] {
        _id,
        _createdAt,
        title,
        category->{
          title,
          _id
        },
        questionImage,
        answerImage,
        slug
      }`;
      
      const result = await client.fetch(query);
      console.log('取得したクイズデータ:', result);
      quizzes = result;
      loading = false;
    } catch (error) {
      console.error('クイズの取得に失敗しました:', error);
      loading = false;
    }
  });

  function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  }

  function getImageUrl(image) {
    if (!image || !image.asset) return '/placeholder-quiz.png';
    return `https://cdn.sanity.io/images/dxl04rd4/production/${image.asset._ref.replace('image-', '').replace('-png', '.png').replace('-jpg', '.jpg').replace('-jpeg', '.jpeg')}`;
  }
</script>

<svelte:head>
  <title>脳トレ日和 - 高齢者向け無料脳トレーニングサイト</title>
  <meta name="description" content="脳トレ日和は高齢者向けの無料脳トレーニングサイトです。マッチ棒クイズや間違い探しなど、楽しく脳を鍛えるクイズをご用意しています。">
</svelte:head>

<!-- 新着クイズセクション -->
<section class="quiz-section">
  <div class="section-header">
    <h2 class="section-title"><img src="/icons/news-icon.png" alt="新着クイズ" class="section-icon" /> 新着クイズ</h2>
  </div>
  
  {#if loading}
    <div class="loading">
      <p>クイズを読み込み中...</p>
    </div>
  {:else if quizzes.length === 0}
    <div class="no-quizzes">
      <p>まだクイズが投稿されていません。</p>
    </div>
  {:else}
    <div class="quiz-grid">
      {#each quizzes as quiz}
        <article class="quiz-card">
          <a href="/quiz/{quiz.slug.current}" class="quiz-link">
            <div class="quiz-image">
              <img src="{getImageUrl(quiz.questionImage || quiz.answerImage)}" alt="{quiz.title}" class="quiz-img" loading="lazy" />
              <div class="quiz-category">{quiz.category?.title || 'クイズ'}</div>
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

<style>
  /* セクションスタイル */
  .quiz-section {
    padding: 2rem 1rem;
    margin-bottom: 3rem;
    max-width: 1200px;
    margin-left: auto;
    margin-right: auto;
  }

  .section-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .section-title {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    color: var(--dark-gray);
    margin-bottom: 0.5rem;
  }

  .section-icon {
    width: 24px;
    height: 24px;
    object-fit: contain;
    margin-right: 0.5rem;
  }

  /* 読み込み・エラー状態 */
  .loading, .no-quizzes {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--medium-gray);
    font-size: 1.1rem;
  }

  /* クイズグリッド */
  .quiz-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
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
    .section-title {
      font-size: 1.6rem;
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
    .quiz-section {
      padding: 1rem 0.5rem;
    }

    .quiz-image {
      height: 160px;
    }
  }
</style>

