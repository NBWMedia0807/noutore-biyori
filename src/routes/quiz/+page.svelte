<script>
  export let data;
  import { createSanityImageSet } from '$lib/utils/images.js';

  const { quizzes } = data;
  const FALLBACK_IMAGE = '/logo.svg';

  function getImageSet(quiz) {
    if (!quiz) return null;
    const fallback =
      quiz.problemImage?.asset?.url || quiz.mainImage?.asset?.url || FALLBACK_IMAGE;
    const source = quiz.problemImage?.asset?._ref
      ? quiz.problemImage
      : quiz.mainImage?.asset?._ref
        ? quiz.mainImage
        : null;
    const builderSource = source ?? fallback;
    if (!builderSource && !fallback) return null;
    return createSanityImageSet(builderSource, {
      width: 640,
      height: 360,
      quality: 75,
      fallbackUrl: fallback || FALLBACK_IMAGE
    });
  }
</script>

<main>
  <div class="section-header">
    <h1 class="section-title">🧩 クイズ一覧</h1>
  </div>

  {#if !quizzes || quizzes.length === 0}
    <p>まだクイズが投稿されていません。</p>
  {:else}
    <div class="quiz-grid">
      {#each quizzes as quiz}
        {@const image = getImageSet(quiz)}
        <article class="quiz-card">
          <a href={`/quiz/${quiz.slug}`} class="quiz-link">
            <div class="quiz-content">
              {#if image?.src}
                <picture>
                  {#if image.avifSrcset}
                    <source srcset={image.avifSrcset} type="image/avif" sizes="(min-width: 960px) 300px, 92vw" />
                  {/if}
                  {#if image.webpSrcset}
                    <source srcset={image.webpSrcset} type="image/webp" sizes="(min-width: 960px) 300px, 92vw" />
                  {/if}
                  <img
                    src={image.src}
                    srcset={image.srcset}
                    sizes="(min-width: 960px) 300px, 92vw"
                    alt={quiz.title}
                    loading="lazy"
                    decoding="async"
                    width="640"
                    height="360"
                    style="max-width:100%;height:auto;border-radius:12px;margin-bottom:1rem"
                  />
                </picture>
              {/if}

              <h2 class="quiz-title">
                {quiz.title || '【マッチ棒クイズ】1本だけ動かして正しい式に：9＋１＝8？'}
              </h2>

              <div class="quiz-category">
                <span class="category-tag">{quiz.category?.title ?? 'クイズ'}</span>
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
