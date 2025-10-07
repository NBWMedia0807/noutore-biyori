<script>
  export let error;
  export let status;

  const statusCode = typeof status === 'number' ? status : 404;
  const headline = statusCode === 404 ? 'ページが見つかりません' : 'エラーが発生しました';
  const description =
    error?.message && typeof error.message === 'string'
      ? error.message
      : 'お探しのページは削除されたか、URLが変更された可能性があります。';

  const suggestionLinks = [
    { href: '/', label: 'トップページに戻る', type: 'link' },
    { href: '/quiz', label: 'クイズ一覧を見る', type: 'link' },
codex/implement-code-improvements-for-adsense-review-3ewrjj

    {
      type: 'message',
      message: 'カテゴリページは記事のパンくずからアクセスできます'
    },
main
    { href: '/contact', label: 'お問い合わせ', type: 'link' }
  ];
</script>

<main class="error-page">
  <div class="error-hero">
    <p class="error-code">{statusCode}</p>
    <h1>{headline}</h1>
    <p class="error-description">{description}</p>
  </div>

  <section class="error-actions" aria-label="サポートリンク">
    <ul>
      {#each suggestionLinks as link, index (link.type === 'message' ? `message-${index}` : link.href)}
        {#if link.type === 'message'}
          <li class="link-disabled" role="note">{link.message}</li>
        {:else}
          <li><a href={link.href} class="action-link">{link.label}</a></li>
        {/if}
      {/each}
    </ul>
  </section>
</main>

<style>
  .error-page {
    min-height: 70vh;
    display: grid;
    place-items: center;
    padding: 4rem 1.5rem;
    gap: 2.5rem;
    background: linear-gradient(135deg, rgba(255, 250, 229, 0.8), rgba(254, 235, 200, 0.75));
  }

  .error-hero {
    text-align: center;
    max-width: 520px;
    display: grid;
    gap: 1.25rem;
  }

  .error-code {
    font-size: clamp(3rem, 10vw, 5rem);
    font-weight: 800;
    color: #f59e0b;
    margin: 0;
    letter-spacing: 0.08em;
  }

  .error-hero h1 {
    font-size: clamp(1.8rem, 5vw, 2.4rem);
    margin: 0;
    color: #78350f;
  }

  .error-description {
    margin: 0;
    color: #92400e;
    line-height: 1.8;
  }

  .error-actions ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 1rem;
  }

  .action-link {
    display: block;
    padding: 0.9rem 1.5rem;
    border-radius: 999px;
    background: linear-gradient(135deg, #facc15, #f97316);
    color: #78350f;
    font-weight: 700;
    text-align: center;
    text-decoration: none;
    box-shadow: 0 16px 40px rgba(249, 115, 22, 0.22);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .action-link:hover,
  .action-link:focus-visible {
    transform: translateY(-2px);
    box-shadow: 0 20px 48px rgba(234, 88, 12, 0.28);
    outline: none;
  }

  .link-disabled {
    text-align: center;
    color: #9a3412;
    font-weight: 600;
    padding: 0.9rem 1.5rem;
    border-radius: 999px;
    background: rgba(253, 230, 138, 0.6);
  }

  @media (max-width: 640px) {
    .error-page {
      padding: 3rem 1rem;
    }

    .error-actions ul {
      gap: 0.75rem;
    }
  }
</style>
