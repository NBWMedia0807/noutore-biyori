<script>
  export let data;
  $: author = data?.author;
</script>

<main class="author-profile">
  <header class="author-header">
    {#if author?.photoUrl}
      <div class="author-photo-wrap">
        <img
          src={author.photoUrl}
          alt={`${author.name}のプロフィール写真`}
          width="160"
          height="160"
          loading="eager"
          decoding="async"
          fetchpriority="high"
          class="author-photo"
        />
      </div>
    {/if}

    <div class="author-meta">
      <h1 class="author-name">{author?.name ?? '著者'}</h1>
      {#if author?.jobTitle}
        <p class="author-job">{author.jobTitle}</p>
      {/if}
    </div>
  </header>

  {#if author?.bio}
    <section class="author-section">
      <h2>プロフィール</h2>
      <p class="author-bio">{author.bio}</p>
    </section>
  {/if}

  {#if author?.career}
    <section class="author-section">
      <h2>経歴・資格</h2>
      <p class="author-career">{author.career}</p>
    </section>
  {/if}

  {#if author?.sameAs?.length}
    <section class="author-section">
      <h2>外部リンク</h2>
      <ul class="author-links">
        {#each author.sameAs as url}
          <li>
            <a href={url} target="_blank" rel="noopener noreferrer me">{url}</a>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</main>

<style>
  .author-profile {
    max-width: 760px;
    margin: 32px auto 64px;
    padding: 0 16px;
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .author-header {
    display: flex;
    align-items: center;
    gap: 24px;
    background: linear-gradient(135deg, rgba(255, 241, 204, 0.7), rgba(255, 255, 255, 0.9));
    border-radius: 24px;
    padding: 28px 24px;
    box-shadow: 0 12px 32px rgba(255, 193, 7, 0.15);
    border: 1px solid rgba(250, 204, 21, 0.35);
  }

  .author-photo-wrap {
    flex-shrink: 0;
  }

  .author-photo {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid rgba(250, 204, 21, 0.6);
  }

  .author-name {
    font-size: clamp(1.5rem, 4vw, 2rem);
    font-weight: 800;
    color: #78350f;
    margin: 0 0 8px;
  }

  .author-job {
    font-size: 0.95rem;
    color: #92400e;
    font-weight: 600;
    margin: 0;
  }

  .author-section {
    background: #fff;
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.07);
    border: 1px solid rgba(248, 196, 113, 0.3);
  }

  .author-section h2 {
    font-size: 1.1rem;
    font-weight: 700;
    color: #92400e;
    margin: 0 0 12px;
    padding-bottom: 8px;
    border-bottom: 2px solid rgba(250, 204, 21, 0.4);
  }

  .author-bio,
  .author-career {
    line-height: 1.85;
    color: #374151;
    margin: 0;
    white-space: pre-wrap;
  }

  .author-links {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .author-links a {
    color: #b45309;
    word-break: break-all;
    font-size: 0.9rem;
  }

  .author-links a:hover {
    text-decoration: underline;
  }

  @media (max-width: 480px) {
    .author-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
    }

    .author-photo {
      width: 96px;
      height: 96px;
    }
  }
</style>
