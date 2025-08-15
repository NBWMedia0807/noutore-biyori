<script>
  import "../lib/styles/global.css";
  
  let isMenuOpen = false;
  
  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }
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
    <button class="mobile-menu-btn" aria-label="メニュー" on:click={toggleMenu}>
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
    </button>
    <ul class="nav-menu" class:active={isMenuOpen}>
      <li><a href="/" class="nav-link"><img src="/icons/home-icon.png" alt="ホーム" class="nav-icon" /> ホーム</a></li>
      <li><a href="/about" class="nav-link"><img src="/icons/news-icon.png" alt="サイトについて" class="nav-icon" /> サイトについて</a></li>
      <li><a href="/contact" class="nav-link"><img src="/icons/text-icon.png" alt="お問い合わせ" class="nav-icon" /> お問い合わせ</a></li>
      <li><a href="/privacy" class="nav-link"><img src="/icons/clock-icon.png" alt="プライバシーポリシー" class="nav-icon" /> プライバシーポリシー</a></li>
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
  }

  .title-section {
    text-align: left;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .nav-icon {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }

  @media (max-width: 768px) {
    .logo-section {
      flex-direction: column;
      text-align: center;
      gap: 0.5rem;
    }

    .title-section {
      text-align: center;
    }

    .logo-image {
      width: 60px;
      height: 60px;
    }
  }
</style>
