<script>
  import ArticleCard from '$lib/components/ArticleCard.svelte';
  import ArticleGrid from '$lib/components/ArticleGrid.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import { resolvePublishedTimestamp } from '$lib/utils/publishedDate.js';

  export let data;

  let category;
  let categoryTitle;
  let slug;
  let newestQuizzes;
  let totalCount;
  let emptyMessage;
  let pagination;
  let pageSize = 12;

  $: category = data?.category ?? null;
  $: categoryTitle = category?.title ?? 'カテゴリ';
  $: slug = category?.slug ?? '';
  $: pagination = data?.pagination ?? null;

  // サーバー側ページングを尊重。未設定時は12件を既定値に。
  $: pageSize = (() => {
    const candidate = Number(pagination?.pageSize);
    if (!Number.isFinite(candidate)) return 12;
    return Math.max(1, Math.trunc(candidate));
  })();

  // newestは現在ページ分をそのまま表示（スライスしない）
  $: newestQuizzes = Array.isArray(data?.newest) ? data.newest : [];
  $: totalCount = typeof data?.totalCount === 'number' ? data.totalCount : newestQuizzes.length;

  $: emptyMessage = categoryTitle
    ? `${categoryTitle}のクイズはまだ公開されていません。`
    : 'このカテゴリのクイズはまだありません。';

  const sortByPublishedAt = (list) =>
    (Array.isArray(list) ? list : [])
      .filter((item) => item?.slug)
      .slice()
      .sort((a, b) => {
        const aContext = a?.slug ?? a?.id ?? 'category';
        const bContext = b?.slug ?? b?.id ?? 'category';
        const aTime = resolvePublishedTimestamp(a, aContext);
        const bTime = resolvePublishedTimestamp(b, bContext);
        const safeA = Number.isFinite(aTime) ? aTime : 0;
        const safeB = Number.isFinite(bTime) ? bTime : 0;
        return safeB - safeA;
      });

  $: sortedNewest = sortByPublishedAt(newestQuizzes);
</script>

{#key slug}
  <section class="category-header" aria-labelledby="category-heading">
    <h1 class="category-title" id="category-heading">{categoryTitle}</h1>
    <div class="quiz-count" aria-live="polite">公開中 {totalCount}問</div>
  </section>

  <section class="quiz-list-section">
    {#if !sortedNewest.length}
      <p class="empty-message">{emptyMessage}</p>
    {:else}
      <ArticleGrid minWidth={240} gap={20}>
        {#each sortedNewest as quiz (quiz.slug)}
          <ArticleCard {quiz} />
        {/each}
      </ArticleGrid>

      {#if pagination?.totalPages > 1}
        <Pagination
          basePath={pagination?.basePath ?? `/category/${slug}`}
          currentPage={pagination?.currentPage ?? 1}
          totalPages={pagination?.totalPages ?? 1}
          totalCount={pagination?.totalCount ?? totalCount}
          pageSize={pageSize}
        />
      {/if}
    {/if}
  </section>
{/key}

<style>
  .category-header {
    background: linear-gradient(135deg, var(--light-yellow, #fff7d6) 0%, var(--light-amber, #ffe8b5) 100%);
    padding: 1.75rem 1.5rem;
    margin-bottom: 1.25rem;
    border-radius: 20px;
    text-align: center;
    box-shadow: 0 12px 28px rgba(253, 186, 45, 0.25);
  }

  .category-title {
    font-size: clamp(2.2rem, 5vw, 2.8rem);
    color: var(--dark-gray, #374151);
    margin: 0 0 0.25rem;
    font-weight: 800;
  }

  .quiz-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    background: rgba(250, 204, 21, 0.22);
    color: #854d0e;
    padding: 0.32rem 1rem;
    border-radius: 999px;
    font-weight: 700;
    font-size: 0.9rem;
  }

  .quiz-list-section {
    max-width: 1200px;
    margin: 0 auto 3rem;
    padding: 0 1.5rem;
    display: grid;
    gap: 1.5rem;
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
      padding: 1.4rem 1.15rem;
    }

    .quiz-list-section {
      padding-inline: 1rem;
    }

  }
</style>
