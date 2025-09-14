<script>
  export let data;
  import "../lib/styles/global.css";
</script>

<header>
  <div class="header-content">
    <a href="/" class="logo-section">
      <img src="/logo.png" alt="脳トレ日和" class="logo-image" />
      <div class="title-section">
        <h1>脳トレ日和</h1>
        <p class="subtitle">楽しく脳を鍛えましょう</p>
      </div>
    </a>
  </div>
</header>

<nav class="main-nav">
  <div class="nav-container">
    <ul class="nav-menu">
      {#if data?.categories?.length}
        {#each data.categories as c}
          <li>
            <a href={`/quiz/${c.slug}`} class="nav-link" data-sveltekit-preload-data>{c.title}</a>
          </li>
        {/each}
      {/if}
    </ul>
  </div>
</nav>

<main>
  <slot />
</main>

<footer>
  <div class="footer-content">
    <p>&copy; 2024 脳トレ日和 - 毎日の脳トレで健康な生活を</p>
    <div class="footer-links">
      <a href="/privacy">プライバシーポリシー</a>
      <a href="/contact">お問い合わせ</a>
      <a href="/about">サイトについて</a>
    </div>
  </div>
</footer>

<style>
  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 1rem;
  }

  .logo-section {
    display: flex;
    align-items: center;
    gap: 1rem;
    text-decoration: none;
    color: inherit;
    transition: transform 0.2s ease;
  }

  .logo-section:hover {
    transform: scale(1.02);
  }

  .logo-image {
    width: 80px;
    height: 80px;
    object-fit: contain;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
    background: var(--white);
    border-radius: 12px;
    padding: 8px;
  }

  .title-section {
    text-align: left;
  }

  .nav-link {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* カテゴリ別色分け */
  .matchstick-link {
    background: var(--light-amber);
    color: #92400e;
  }

  .difference-link {
    background: var(--light-orange);
    color: #9a3412;
  }

  @media (max-width: 768px) {
    .logo-section {
      /* スマホでも横並びを維持 */
      flex-direction: row;
      text-align: left;
      gap: 1rem;
    }

    .title-section {
      text-align: left;
    }

    .logo-image {
      width: 60px;
      height: 60px;
    }
  }
</style>
