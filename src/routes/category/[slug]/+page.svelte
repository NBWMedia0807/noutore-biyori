<script>
  import { createSanityImageSet } from '$lib/utils/images.js';

  export let data;

  const category = data?.category ?? null;
  const categoryTitle = category?.title ?? '';
  const slug = category?.slug ?? '';
  const overview = typeof data?.overview === 'string' ? data.overview : '';
  const overviewParagraphs = overview
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const defaultOverview = categoryTitle
    ? `${categoryTitle}のクイズ一覧ページです。`
    : 'カテゴリのクイズ一覧ページです。';
  const newestQuizzes = Array.isArray(data?.newest) ? data.newest : [];
  const popularQuizzes = Array.isArray(data?.popular) ? data.popular : [];
  const totalCount = typeof data?.totalCount === 'number' ? data.totalCount : newestQuizzes.length;

  const tabs = [
    { id: 'newest', label: '新着' },
    { id: 'popular', label: '人気' }
  ];

  let activeTab = 'newest';

  $: visibleQuizzes = activeTab === 'popular' ? popularQuizzes : newestQuizzes;
  const tabId = (value) => `tab-${value}`;
  const panelId = (value) => `panel-${value}`;
  $: activePanelId = panelId(activeTab);

  const FALLBACK_IMAGE = '/logo.svg';

  const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
  };

  const getImageSet = (quiz) => {
    const source = quiz?.image ?? quiz?.problemImage ?? quiz?.mainImage ?? quiz?.answerImage ?? null;
    const fallback = source?.asset?.url ?? FALLBACK_IMAGE;
    return createSanityImageSet(source ?? fallback, {
      width: 600,
      height: 360,
      quality: 80,
      fallbackUrl: fallback
    });
  };

  const getDimensions = (quiz) => {
    const source = quiz?.image ?? quiz?.problemImage ?? quiz?.mainImage ?? quiz?.answerImage;
    return source?.asset?.metadata?.dimensions ?? { width: 600, height: 360 };
  };

  const emptyMessage = categoryTitle ? `${categoryTitle}のクイズはまだ公開されていません。` : 'このカテゴリのクイズはまだありません。';
</script>

{#key slug}
  <!-- カテゴリヘッダー -->
  <section class="category-header" aria-labelledby="category-heading">
    <div class="category-info">
      <h1 class="category-title" id="category-heading">{categoryTitle}</h1>
      <div class="category-description">
        {#if overviewParagraphs.length}
          {#each overviewParagraphs as paragraph}
            <p>{paragraph}</p>
          {/each}
        {:else}
          <p>{defaultOverview}</p>
        {/if}
      </div>
      <div class="quiz-count" aria-live="polite">公開中 {totalCount}問</div>
    </div>
  </section>

  <!-- クイズ一覧 -->
  <section class="quiz-list-section">
    <div class="tab-switcher" role="tablist" aria-label="表示切り替え">
      {#each tabs as tab}
        <button
          type="button"
          id={tabId(tab.id)}
          role="tab"
          class:active={activeTab === tab.id}
          aria-selected={activeTab === tab.id}
          aria-controls={panelId(tab.id)}
          on:click={() => (activeTab = tab.id)}
        >
          {tab.label}
        </button>
      {/each}
    </div>

    <div
      id={activePanelId}
      class="quiz-panel"
      role="tabpanel"
      aria-labelledby={tabId(activeTab)}
      tabindex="0"
    >
      {#if visibleQuizzes.length === 0}
        <div class="no-quizzes">
          <p>{emptyMessage}</p>
          <p>新しいクイズをお楽しみに！</p>
        </div>
      {:else}
        <div class="quiz-grid">
          {#each visibleQuizzes as quiz (quiz.slug)}
            {@const imageSet = getImageSet(quiz)}
            {@const dims = getDimensions(quiz)}
            <article class="quiz-card">
              <a href={`/quiz/${quiz.slug}`} class="quiz-link">
                {#if imageSet?.src}
                  <div class="quiz-image">
                    <picture>
                      {#if imageSet.avifSrcset}
                        <source srcset={imageSet.avifSrcset} type="image/avif" sizes="(min-width: 768px) 280px, 90vw" />
                      {/if}
                      {#if imageSet.webpSrcset}
                        <source srcset={imageSet.webpSrcset} type="image/webp" sizes="(min-width: 768px) 280px, 90vw" />
                      {/if}
                      <img
                        src={imageSet.src}
                        srcset={imageSet.srcset}
                        sizes="(min-width: 768px) 280px, 90vw"
                        alt={`${quiz.title}の問題イメージ`}
                        loading="lazy"
                        decoding="async"
                        width={Math.round(dims.width)}
                        height={Math.round(dims.height)}
                      />
                    </picture>
                    <div class="quiz-category">#{quiz.category?.title ?? categoryTitle}</div>
                  </div>
                {/if}
                <div class="quiz-content">
                  {#if quiz?.publishedAt || quiz?.createdAt}
                    <div class="quiz-date">{formatDate(quiz.publishedAt ?? quiz.createdAt)}</div>
                  {/if}
                  <h3 class="quiz-title">{quiz.title}</h3>
                </div>
              </a>
            </article>
          {/each}
        </div>
      {/if}
    </div>
  </section>
{/key}

<style>
  .category-header {
    background: linear-gradient(135deg, var(--light-yellow, #fff7d6) 0%, var(--light-amber, #ffe8b5) 100%);
    padding: 2.5rem 1.5rem;
    margin-bottom: 2.5rem;
    border-radius: 20px;
    text-align: center;
    box-shadow: 0 20px 45px rgba(253, 186, 45, 0.2);
  }

  .category-info {
    max-width: 820px;
    margin: 0 auto;
    display: grid;
    gap: 1.2rem;
  }

  .category-title {
    font-size: clamp(2.2rem, 5vw, 2.8rem);
    color: var(--dark-gray, #374151);
    margin: 0;
    font-weight: 800;
  }

  .category-description {
    display: grid;
    gap: 0.8rem;
    color: var(--medium-gray, #4b5563);
    line-height: 1.75;
    font-size: 1.05rem;
  }

  .category-description p {
    margin: 0;
  }

  .quiz-count {
    display: inline-flex;
    align-self: center;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    background: rgba(250, 204, 21, 0.22);
    color: #854d0e;
    padding: 0.55rem 1.4rem;
    border-radius: 999px;
    font-weight: 700;
    font-size: 0.95rem;
  }

  .quiz-list-section {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1.5rem 3rem;
    display: grid;
    gap: 1.8rem;
  }

  .tab-switcher {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 999px;
    padding: 0.5rem 0.75rem;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
    margin-inline: auto;
  }

  .tab-switcher button {
    border: none;
    background: transparent;
    font-weight: 700;
    color: #78350f;
    padding: 0.6rem 1.6rem;
    border-radius: 999px;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.2s ease;
    min-width: 96px;
    min-height: 44px;
  }

  .tab-switcher button:hover,
  .tab-switcher button:focus-visible {
    background: rgba(250, 204, 21, 0.25);
    outline: none;
    transform: translateY(-1px);
  }

  .tab-switcher button.active {
    background: linear-gradient(135deg, #facc15, #f97316);
    color: #78350f;
    box-shadow: 0 12px 25px rgba(249, 115, 22, 0.25);
  }

  .quiz-panel {
    outline: none;
  }

  .quiz-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1.6rem;
  }

  .quiz-card {
    background: #ffffff;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
    border: 1px solid rgba(248, 196, 113, 0.35);
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }

  .quiz-card:hover,
  .quiz-card:focus-within {
    transform: translateY(-4px);
    box-shadow: 0 20px 48px rgba(234, 88, 12, 0.18);
  }

  .quiz-link {
    text-decoration: none;
    color: inherit;
    display: grid;
    gap: 0;
  }

  .quiz-image {
    position: relative;
    overflow: hidden;
  }

  .quiz-image picture,
  .quiz-image img {
    display: block;
    width: 100%;
  }

  .quiz-image picture {
    aspect-ratio: calc(5 / 3);
  }

  .quiz-image img {
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  .quiz-card:hover .quiz-image img,
  .quiz-card:focus-within .quiz-image img {
    transform: scale(1.03);
  }

  .quiz-category {
    position: absolute;
    top: 12px;
    right: 12px;
    background: rgba(250, 204, 21, 0.95);
    color: #7c2d12;
    padding: 0.4rem 0.9rem;
    border-radius: 999px;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    box-shadow: 0 8px 18px rgba(250, 204, 21, 0.35);
  }

  .quiz-content {
    padding: 1.4rem 1.6rem 1.6rem;
    display: grid;
    gap: 0.6rem;
  }

  .quiz-date {
    color: var(--medium-gray, #4b5563);
    font-size: 0.9rem;
  }

  .quiz-title {
    font-size: 1.15rem;
    color: var(--dark-gray, #1f2937);
    margin: 0;
    line-height: 1.5;
    font-weight: 700;
  }

  .no-quizzes {
    text-align: center;
    padding: 2.5rem 1.5rem;
    background: rgba(255, 255, 255, 0.85);
    border-radius: 20px;
    border: 1px dashed rgba(250, 204, 21, 0.5);
    color: #92400e;
    box-shadow: 0 12px 30px rgba(250, 204, 21, 0.15);
  }

  .no-quizzes p {
    margin: 0.4rem 0;
    font-size: 1rem;
  }

  @media (max-width: 768px) {
    .category-header {
      padding: 2rem 1.25rem;
    }

    .quiz-list-section {
      padding-inline: 1rem;
    }

    .quiz-grid {
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1.2rem;
    }

    .tab-switcher {
      flex-wrap: wrap;
      justify-content: center;
    }
  }

  @media (max-width: 520px) {
    .quiz-grid {
      grid-template-columns: 1fr;
    }

    .quiz-image picture {
      aspect-ratio: calc(4 / 3);
    }
  }
</style>

