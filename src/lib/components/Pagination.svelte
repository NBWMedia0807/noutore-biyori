<script>
  export let basePath = '/';
  export let currentPage = 1;
  export let totalPages = 1;
  export let totalCount = 0;
  export let pageSize = 10;

  const normalizePositiveInt = (value, fallback = 1) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    const int = Math.trunc(number);
    return int >= 1 ? int : fallback;
  };

  $: normalizedTotalPages = normalizePositiveInt(totalPages, 1);
  $: normalizedPageSize = normalizePositiveInt(pageSize, 10);
  $: safeCurrentPage = (() => {
    const candidate = normalizePositiveInt(currentPage, 1);
    return Math.min(candidate, normalizedTotalPages);
  })();

  const createHref = (page) => {
    const normalizedBase =
      typeof basePath === 'string' && basePath.trim().length > 0 ? basePath.trim() : '/';

    const hashIndex = normalizedBase.indexOf('#');
    const hasHash = hashIndex !== -1;
    const pathAndQuery = hasHash ? normalizedBase.slice(0, hashIndex) : normalizedBase;
    const hashFragment = hasHash ? normalizedBase.slice(hashIndex + 1) : '';

    const [rawPath = '/', rawQuery = ''] = pathAndQuery.split('?');
    const safePath = rawPath.trim() || '/';
    const searchParams = new URLSearchParams(rawQuery);

    if (page <= 1) {
      searchParams.delete('page');
    } else {
      searchParams.set('page', page);
    }

    const queryString = searchParams.toString();
    const hashString = hashFragment ? `#${hashFragment}` : '';
    return `${safePath}${queryString ? `?${queryString}` : ''}${hashString}`;
  };

  const buildPaginationItems = (current, total) => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => ({ type: 'page', value: index + 1 }));
    }

    const candidates = [1, 2, total - 1, total, current - 1, current, current + 1];
    const pages = [...new Set(candidates.filter((page) => page >= 1 && page <= total))].sort(
      (a, b) => a - b
    );

    const items = [];
    for (let index = 0; index < pages.length; index += 1) {
      const page = pages[index];
      const prev = index > 0 ? pages[index - 1] : null;
      if (prev && page - prev > 1) {
        items.push({ type: 'ellipsis', id: `ellipsis-${prev}-${page}` });
      }
      items.push({ type: 'page', value: page });
    }
    return items;
  };

  $: paginationItems = buildPaginationItems(safeCurrentPage, normalizedTotalPages);
  $: previousPage = safeCurrentPage > 1 ? safeCurrentPage - 1 : null;
  $: nextPage = safeCurrentPage < normalizedTotalPages ? safeCurrentPage + 1 : null;
  $: hasItems = Number(totalCount) > 0;
  $: rangeStart = hasItems ? (safeCurrentPage - 1) * normalizedPageSize + 1 : 0;
  $: rangeEnd = hasItems ? Math.min(Number(totalCount), safeCurrentPage * normalizedPageSize) : 0;
</script>

{#if normalizedTotalPages > 1}
  <nav class="pagination" aria-label="ページネーション">
    <div class="pagination__summary" aria-live="polite">
      全{totalCount}件{#if hasItems}（{rangeStart}〜{rangeEnd}件を表示中）{/if}
    </div>
    <ul class="pagination__list">
      <li>
        {#if previousPage}
          <a class="pagination__link pagination__link--nav" href={createHref(previousPage)} rel="prev">
            前へ
          </a>
        {:else}
          <span class="pagination__link pagination__link--nav is-disabled" aria-disabled="true">
            前へ
          </span>
        {/if}
      </li>
      {#each paginationItems as item}
        {#if item.type === 'ellipsis'}
          <li class="pagination__ellipsis" aria-hidden="true">…</li>
        {:else}
          <li>
            {#if item.value === safeCurrentPage}
              <span class="pagination__link is-active" aria-current="page">{item.value}</span>
            {:else}
              <a class="pagination__link" href={createHref(item.value)}>{item.value}</a>
            {/if}
          </li>
        {/if}
      {/each}
      <li>
        {#if nextPage}
          <a class="pagination__link pagination__link--nav" href={createHref(nextPage)} rel="next">
            次へ
          </a>
        {:else}
          <span class="pagination__link pagination__link--nav is-disabled" aria-disabled="true">
            次へ
          </span>
        {/if}
      </li>
    </ul>
  </nav>
{/if}

<style>
  .pagination {
    display: grid;
    gap: 0.75rem;
    justify-items: center;
    margin-top: 1.5rem;
  }

  .pagination__summary {
    font-size: 0.95rem;
    color: #6b7280;
  }

  .pagination__list {
    list-style: none;
    display: inline-flex;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    background: rgba(255, 255, 255, 0.85);
    border-radius: 999px;
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
    padding: 0.5rem 0.75rem;
  }

  .pagination__link {
    min-width: 44px;
    min-height: 44px;
    padding: 0.5rem 1rem;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    text-decoration: none;
    color: #78350f;
    background: transparent;
    transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
  }

  .pagination__link:hover,
  .pagination__link:focus-visible {
    background: rgba(250, 204, 21, 0.25);
    outline: none;
    transform: translateY(-1px);
  }

  .pagination__link.is-active {
    background: linear-gradient(135deg, #facc15, #f97316);
    color: #78350f;
    box-shadow: 0 12px 24px rgba(249, 115, 22, 0.25);
    cursor: default;
    transform: none;
  }

  .pagination__link.is-active:hover,
  .pagination__link.is-active:focus-visible {
    background: linear-gradient(135deg, #facc15, #f97316);
  }

  .pagination__link.is-disabled {
    pointer-events: none;
    color: rgba(120, 53, 15, 0.4);
    background: transparent;
    box-shadow: none;
  }

  .pagination__link--nav {
    padding-inline: 1.25rem;
  }

  .pagination__ellipsis {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: rgba(120, 53, 15, 0.6);
    padding: 0 0.35rem;
    min-width: 24px;
  }

  @media (max-width: 640px) {
    .pagination {
      justify-items: stretch;
    }

    .pagination__list {
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.4rem;
    }

    .pagination__link {
      min-width: 40px;
      min-height: 40px;
      font-size: 0.95rem;
      padding: 0.45rem 0.9rem;
    }

    .pagination__link--nav {
      padding-inline: 1rem;
    }
  }
</style>
