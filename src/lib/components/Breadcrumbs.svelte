<script>
  export let items = [];

  const normalized = (() => {
    const list = Array.isArray(items) ? items.filter((item) => item && item.name) : [];
    const home = { name: 'ホーム', url: '/' };
    if (list.length === 0) return [home];
    const withHome = list[0]?.name === home.name ? list : [home, ...list];
    return withHome.map((item, index) => ({
      ...item,
      url: item.url ?? item.path ?? (index === withHome.length - 1 ? undefined : '/'),
      name: item.name
    }));
  })();
</script>

<nav aria-label="パンくずリスト" class="breadcrumbs" itemscope itemtype="https://schema.org/BreadcrumbList">
  <ol>
    {#each normalized as item, index (item.name + index)}
      <li itemscope itemprop="itemListElement" itemtype="https://schema.org/ListItem">
        {#if index < normalized.length - 1 && item.url}
          <a href={item.url} itemprop="item">
            <span itemprop="name">{item.name}</span>
          </a>
          <meta itemprop="position" content={index + 1} />
          <span class="separator" aria-hidden="true">›</span>
        {:else}
          <span itemprop="name" aria-current="page">{item.name}</span>
          <meta itemprop="position" content={index + 1} />
        {/if}
      </li>
    {/each}
  </ol>
</nav>

<style>
  .breadcrumbs {
    font-size: 0.875rem;
    color: #6c757d;
    margin-bottom: 1rem;
  }

  .breadcrumbs ol {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .breadcrumbs li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .breadcrumbs a {
    color: inherit;
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .breadcrumbs a:hover {
    color: #495057;
    text-decoration: underline;
  }

  .separator {
    color: #adb5bd;
  }
</style>
