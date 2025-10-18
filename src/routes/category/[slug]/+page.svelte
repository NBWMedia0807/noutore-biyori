<script>
  import ArticleCard from '$lib/components/ArticleCard.svelte';
  import ArticleGrid from '$lib/components/ArticleGrid.svelte';
  import Pagination from '$lib/components/Pagination.svelte';

  export let data;

  let category;
  let categoryTitle;
  let slug;
  let newestQuizzes;
  let popularQuizzes;
  let totalCount;
  let emptyMessage;
  let pagination;
  let pageSize = 10;

  $: category = data?.category ?? null;
  $: categoryTitle = category?.title ?? 'カテゴリ';
  $: slug = category?.slug ?? '';
  $: pagination = data?.pagination ?? null;
  $: pageSize = (() => {
    const candidate = Number(pagination?.pageSize);
    if (!Number.isFinite(candidate)) return 10;
    return Math.max(1, Math.trunc(candidate));
  })();
  $: newestQuizzes = Array.isArray(data?.newest) ? data.newest.slice(0, pageSize) : [];
  $: popularQuizzes = Array.isArray(data?.popular) ? data.popular : [];
  $: totalCount = typeof data?.totalCount === 'number' ? data.totalCount : newestQuizzes.length;
  $: emptyMessage = categoryTitle
    ? `${categoryTitle}のクイズはまだ公開されていません。`
    : 'このカテゴリのクイズはまだありません。';

  const sortByPublishedAt = (list) =>
    (Array.isArray(list) ? list : [])
      .filter((item) => item?.slug)
      .slice()
      .sort((a, b) => {
        const aDate = new Date(a?.publishedAt ?? a?._createdAt ?? 0).getTime();
        const bDate = new Date(b?.publishedAt ?? b?._createdAt ?? 0).getTime();
        return bDate - aDate;
      });

  let activeTab = 'newest';

  $: sortedNewest = sortByPublishedAt(newestQuizzes);
  $: sortedPopular = sortByPublishedAt(popularQuizzes);
  $: tabDefinitions = [
    { id: 'newest', label: '新着', items: sortedNewest },
    { id: 'popular', label: '人気', items: sortedPopular }
  ].filter((tab) => tab.id === 'newest' || tab.items.length > 0);

  $: {
    if (tabDefinitions.length > 0 && !tabDefinitions.some((tab) => tab.id === activeTab)) {
      activeTab = tabDefinitions[0].id;
    }
  }

  $: visibleQuizzes = (tabDefinitions.find((tab) => tab.id === activeTab)?.items) ?? sortedNewest;

  const tabId = (value) => `tab-${value}`;
  const panelId = (value) => `panel-${value}`;
</script>

{#key slug}
  <section class="category-header" aria-labelledby="category-heading">
    <h1 class="category-title" id="category-heading">{categoryTitle}</h1>
    <div class="quiz-count" aria-live="polite">公開中 {totalCount}問</div>
  </section>

  <section class="quiz-list-section">
    {#if tabDefinitions.length > 1}
      <div class="tab-switcher" role="tablist" aria-label="表示切り替え">
        {#each tabDefinitions as tab}
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
    {/if}

    <div
      id={panelId(activeTab)}
      class="quiz-panel"
      role="tabpanel"
      aria-labelledby={tabId(activeTab)}
      tabindex="0"
    >
      {#if !visibleQuizzes.length}
        <p class="empty-message">{emptyMessage}</p>
      {:else}
        <ArticleGrid>
          {#each visibleQuizzes as quiz (quiz.slug)}
            <ArticleCard {quiz} />
          {/each}
        </ArticleGrid>
        {#if activeTab === 'newest' && pagination?.totalPages > 1}
          <Pagination
            basePath={pagination?.basePath ?? `/category/${slug}`}
            currentPage={pagination?.currentPage ?? 1}
            totalPages={pagination?.totalPages ?? 1}
            totalCount={pagination?.totalCount ?? totalCount}
            pageSize={pageSize}
          />
        {/if}
      {/if}
    </div>
  </section>
{/key}

<style>
  .category-header {
    background: linear-gradient(135deg, var(--light-yellow, #fff7d6) 0%, var(--light-amber, #ffe8b5) 100%);
    padding: 2.5rem 1.5rem;
    margin-bottom: 2rem;
    border-radius: 20px;
    text-align: center;
    box-shadow: 0 12px 28px rgba(253, 186, 45, 0.25);
  }

  .category-title {
    font-size: clamp(2.2rem, 5vw, 2.8rem);
    color: var(--dark-gray, #374151);
    margin: 0 0 0.75rem;
    font-weight: 800;
  }

  .quiz-count {
    display: inline-flex;
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
    margin: 0 auto 3rem;
    padding: 0 1.5rem;
    display: grid;
    gap: 1.5rem;
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

  .empty-message {
    text-align: center;
    padding: 2rem 1.5rem;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.85);
    border: 1px dashed rgba(250, 204, 21, 0.5);
    color: #92400e;
  }

  @media (max-width: 768px) {
    .category-header {
      padding: 2rem 1.25rem;
    }

    .quiz-list-section {
      padding-inline: 1rem;
    }

    .tab-switcher {
      flex-wrap: wrap;
      justify-content: center;
    }
  }
</style>
