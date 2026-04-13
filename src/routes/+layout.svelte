<script>
  import '../lib/styles/global.css';
  import { page } from '$app/stores';
  import { createPageSeo } from '$lib/seo.js';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import { onMount } from 'svelte';
  import { afterNavigate, beforeNavigate } from '$app/navigation';
  import { loadGtagOnce, sendPageView } from '$lib/ga';
  import SEO from '$lib/components/SEO.svelte';
  import { env } from '$env/dynamic/public';
  const PUBLIC_PUBLISHER_CENTER_VERIFICATION = env.PUBLIC_PUBLISHER_CENTER_VERIFICATION ?? '';

  // サイドレール広告スロットID（AdSenseダッシュボードで作成した専用スロットに変更してください）
  const SIDE_RAIL_SLOT = '5756190566';
  const AD_CLIENT = 'ca-pub-2298313897414846';

  /** @type {HTMLDivElement|null} */
  let leftRailRef = null;
  /** @type {HTMLDivElement|null} */
  let rightRailRef = null;

  function mountSideRailAd(container) {
    if (!container) return;
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.cssText = 'display:block;width:160px;height:600px;';
    ins.dataset.adClient = AD_CLIENT;
    ins.dataset.adSlot = SIDE_RAIL_SLOT;
    container.appendChild(ins);
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (_) {}
  }

  export let data;

  $: currentPage = $page;
  $: ui = currentPage?.data?.ui ?? {};

  // パンくずリスト
  $: breadcrumbs = Array.isArray(currentPage?.data?.breadcrumbs)
    ? currentPage.data.breadcrumbs
    : [];

  $: reviewMode = Boolean(data?.flags?.adsenseReviewMode);
  $: hasQuery = Boolean(currentPage?.url?.search && currentPage.url.search.length > 0);
  $: mainClass = typeof ui?.mainClass === 'string' ? ui.mainClass : '';
  let shouldSkipNextPageView = true;
  let menuOpen = false;
  const toggleMenu = () => { menuOpen = !menuOpen; };
  const closeMenu = () => { menuOpen = false; };

  // vignette広告などでページが非表示→再表示された時にTOPへ戻すためのフラグ
  let navigatingPending = false;

  beforeNavigate(() => {
    navigatingPending = true;
  });

  afterNavigate(({ type, to }) => {
    navigatingPending = false;
    menuOpen = false;
    if (type !== 'popstate' && !to?.url?.hash) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      });
    }
  });

  $: isErrorPage = !!currentPage.error;

  // SEO設定
  $: fallbackSeo = createPageSeo({
    path: currentPage?.url?.pathname ?? '/',
    appendSiteName: false,
  });
  $: providedSeo = currentPage?.data?.seo ?? {};
  $: seo = {
    ...fallbackSeo,
    ...providedSeo,
    title: isErrorPage ? 'エラー' : (providedSeo.title ?? fallbackSeo.title),
    description: isErrorPage
      ? 'ページが見つかりませんでした。'
      : (providedSeo.description ?? fallbackSeo.description),
    canonical: providedSeo.canonical ?? fallbackSeo.canonical,
    image: providedSeo.image ?? fallbackSeo.image,
    type: providedSeo.type ?? fallbackSeo.type,
    jsonld: Array.isArray(providedSeo.jsonld)
      ? providedSeo.jsonld.filter(Boolean)
      : fallbackSeo.jsonld,
  };

  // noindex判定
  $: isAnswerPage = (currentPage?.url?.pathname ?? '').endsWith('/answer');
  $: noindexPage = isErrorPage || hasQuery || isAnswerPage || seo.noindex === true;

  const SITE_NAME = '脳トレ日和';

  $: if (typeof document !== 'undefined') {
    document.documentElement.dataset.reviewMode = reviewMode ? 'true' : 'false';
    document.body.dataset.reviewMode = reviewMode ? 'true' : 'false';
  }

  // ページ遷移後のGA計測
  afterNavigate((navigation) => {
    if (shouldSkipNextPageView) {
      shouldSkipNextPageView = false;
      return;
    }
    const path = navigation?.to?.url?.pathname ?? window.location.pathname;
    const search = navigation?.to?.url?.search ?? window.location.search;
    sendPageView(`${path}${search}`);
  });

  onMount(() => {
    // サイドレール広告を初期化（十分な画面幅がある場合のみ）
    if (window.innerWidth >= 1540) {
      mountSideRailAd(leftRailRef);
      mountSideRailAd(rightRailRef);
    }

    // GA4はga.tsのloadGtagOnce()に一本化（二重読み込み防止）
    loadGtagOnce();
    sendPageView(`${window.location.pathname}${window.location.search}`);

    // vignette広告などの全画面広告を閉じた後にTOPへ戻す
    // ナビゲーション中にページが非表示→再表示されたケースを補完
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigatingPending) {
        navigatingPending = false;
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  });
</script>

<svelte:head>
  <!-- GA4スクリプトはga.tsのloadGtagOnce()で動的に読み込むため、ここには記載しない -->
  <script
    async
    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2298313897414846"
    crossorigin="anonymous"
  ></script>
  <link rel="preconnect" href="https://cdn.sanity.io" crossorigin />
  <link rel="preload" href="/logo.svg" as="image" type="image/svg+xml" fetchpriority="high" />
  <!-- Google Publisher Center 所有権確認（環境変数 PUBLIC_PUBLISHER_CENTER_VERIFICATION に値を設定） -->
  {#if PUBLIC_PUBLISHER_CENTER_VERIFICATION}
    <meta name="google-site-verification" content={PUBLIC_PUBLISHER_CENTER_VERIFICATION} />
  {/if}
</svelte:head>

<SEO
  title={seo.title}
  description={seo.description}
  canonical={seo.canonical}
  image={seo.image}
  noindex={noindexPage}
  type={seo.type ?? 'website'}
  jsonld={seo.jsonld ?? null}
  article={seo.article ?? null}
/>

{#if ui.showHeader !== false}
  <header data-review-mode={reviewMode}>
    <div class="header-content">
      <a href="/" class="logo-section" aria-label="脳トレ日和 トップページ">
        <img
          src="/logo.svg"
          alt="脳トレ日和"
          class="logo-image"
          width="80"
          height="80"
          decoding="async"
          fetchpriority="high"
        />
        <div class="title-section">
          <h1>脳トレ日和</h1>
        </div>
      </a>
      <button
        class="hamburger-btn"
        type="button"
        aria-label={menuOpen ? 'メニューを閉じる' : 'メニューを開く'}
        aria-expanded={menuOpen}
        aria-controls="site-menu"
        on:click={toggleMenu}
      >
        <span class="hamburger-bar" class:open={menuOpen}></span>
        <span class="hamburger-bar" class:open={menuOpen}></span>
        <span class="hamburger-bar" class:open={menuOpen}></span>
      </button>
    </div>
  </header>
{/if}

{#if menuOpen}
  <div class="menu-overlay" role="dialog" aria-modal="true" aria-label="サイトメニュー" id="site-menu">
    <div class="menu-panel">
      <button class="menu-close" type="button" aria-label="メニューを閉じる" on:click={closeMenu}>
        <span aria-hidden="true">✕</span>
      </button>

      <nav class="menu-section" aria-label="カテゴリ">
        <p class="menu-section-heading">カテゴリ</p>
        <ul class="menu-list">
          {#if data?.categories?.length}
            {#each data.categories as c}
              <li><a href="/category/{c.slug}" on:click={closeMenu}>{c.title}</a></li>
            {/each}
          {/if}
          <li><a href="/category/kanji-quiz" on:click={closeMenu}>難読漢字</a></li>
          <li><a href="/category/business-manner" on:click={closeMenu}>ビジネスマナー</a></li>
          <li><a href="/category/number-quiz" on:click={closeMenu}>数字クイズ</a></li>
          <li><a href="/category/pc-skill-quiz" on:click={closeMenu}>PCスキルクイズ</a></li>
        </ul>
      </nav>

      <nav class="menu-section" aria-label="メニュー">
        <p class="menu-section-heading">メニュー</p>
        <ul class="menu-list">
          <li><a href="/about" on:click={closeMenu}>会社概要</a></li>
          <li><a href="/author/editorial-team" on:click={closeMenu}>著者情報</a></li>
          <li><a href="/privacy-policy" on:click={closeMenu}>プライバシーポリシー</a></li>
          <li><a href="/terms" on:click={closeMenu}>利用規約</a></li>
          <li><a href="/disclaimer" on:click={closeMenu}>免責事項</a></li>
          <li><a href="/contact" on:click={closeMenu}>お問い合わせ</a></li>
        </ul>
      </nav>
    </div>
    <button class="menu-backdrop" type="button" aria-label="メニューを閉じる" on:click={closeMenu}></button>
  </div>
{/if}

{#if !ui.hideGlobalNavTabs}
  <nav class="main-nav">
    <div class="nav-container">
      <ul class="nav-menu">
        {#if data?.categories?.length}
          {#each data.categories.filter(c => c.title !== '読解クイズ') as c}
            <li>
              <a href={`/category/${c.slug}`} class="nav-link" data-sveltekit-preload-data
                >{c.title}</a
              >
            </li>
          {/each}
        {/if}
        <li>
          <a href="/category/kanji-quiz" class="nav-link" data-sveltekit-preload-data>難読漢字</a>
        </li>
        <li>
          <a href="/category/business-manner" class="nav-link" data-sveltekit-preload-data>ビジネスマナー</a>
        </li>
        <li>
          <a href="/category/number-quiz" class="nav-link" data-sveltekit-preload-data>数字クイズ</a>
        </li>
        <li>
          <a href="/category/pc-skill-quiz" class="nav-link" data-sveltekit-preload-data>PCスキルクイズ</a>
        </li>
      </ul>
    </div>
  </nav>
{/if}

{#if !ui.hideBreadcrumbs && breadcrumbs.length}
  <div class="breadcrumbs-container">
    <Breadcrumbs items={breadcrumbs} />
  </div>
{/if}

<!-- サイドレール広告（PC幅が十分な場合のみ表示） -->
<aside class="side-rail side-rail--left" aria-hidden="true">
  <div class="side-rail__inner" bind:this={leftRailRef}></div>
</aside>
<aside class="side-rail side-rail--right" aria-hidden="true">
  <div class="side-rail__inner" bind:this={rightRailRef}></div>
</aside>

<main class={mainClass}>
  <slot />
</main>

<footer data-review-mode={reviewMode}>
  <div class="footer-content">
    <p class="footer-copy">&copy; 2025年9月 脳トレ日和</p>
    <p class="footer-tagline">毎日の脳トレで健康な生活を</p>
  </div>
</footer>

<style>
  .breadcrumbs-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .footer-copy,
  .footer-tagline {
    margin: 0.25rem 0;
  }

  /* ── サイト名フォントサイズ ────────────── */
  :global(.title-section h1) {
    font-size: clamp(1.8rem, 5.5vw, 2.6rem);
  }

  /* ── ハンバーガーボタン ────────────── */
  .hamburger-btn {
    position: absolute;
    right: 1rem; /* header の padding と揃えて画面右端に寄せる */
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    width: 40px;
    height: 40px;
    padding: 6px;
    background: rgba(255, 255, 255, 0.5);
    border: 1.5px solid rgba(120, 53, 15, 0.25);
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .hamburger-btn:hover {
    background: rgba(255, 255, 255, 0.75);
  }

  .hamburger-bar {
    display: block;
    width: 100%;
    height: 2px;
    background: #78350f;
    border-radius: 2px;
    transition: transform 0.25s ease, opacity 0.25s ease;
    transform-origin: center;
  }

  .hamburger-bar:nth-child(1).open {
    transform: translateY(7px) rotate(45deg);
  }
  .hamburger-bar:nth-child(2).open {
    opacity: 0;
  }
  .hamburger-bar:nth-child(3).open {
    transform: translateY(-7px) rotate(-45deg);
  }

  /* ── オーバーレイ ────────────── */
  .menu-overlay {
    position: fixed;
    inset: 0;
    z-index: 300;
    display: flex;
    justify-content: flex-end;
  }

  .menu-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    border: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .menu-panel {
    position: relative;
    z-index: 1;
    width: min(320px, 88vw);
    height: 100%;
    background: #fff;
    box-shadow: -4px 0 32px rgba(15, 23, 42, 0.2);
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
    padding: 1.5rem 1.25rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    animation: slideInRight 0.25s ease;
  }

  @keyframes slideInRight {
    from { transform: translateX(100%); }
    to   { transform: translateX(0); }
  }

  .menu-close {
    align-self: flex-end;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--light-amber);
    border: 1.5px solid rgba(245, 158, 11, 0.4);
    border-radius: 50%;
    font-size: 1rem;
    color: #78350f;
    cursor: pointer;
    transition: background 0.2s ease;
    flex-shrink: 0;
  }

  .menu-close:hover {
    background: var(--light-orange);
  }

  .menu-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .menu-section-heading {
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--medium-gray);
    margin: 0 0 0.25rem;
    padding-bottom: 0.4rem;
    border-bottom: 2px solid var(--light-amber);
  }

  .menu-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  .menu-list li {
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  }

  .menu-list li:last-child {
    border-bottom: none;
  }

  .menu-list a {
    display: flex;
    align-items: center;
    padding: 0.7rem 0.25rem;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--dark-gray);
    text-decoration: none;
    transition: color 0.15s ease, padding-left 0.15s ease;
  }

  .menu-list a:hover {
    color: var(--primary-amber);
    padding-left: 0.5rem;
  }

  /* ── サイドレール広告 ────────────── */
  .side-rail {
    display: none;
    position: fixed;
    top: 140px; /* header + sticky nav の高さ分 */
    width: 160px;
    height: 0; /* flex コンテナに高さを与えない */
    z-index: 10; /* sticky nav (z-index:100) より下、コンテンツより上 */
    flex: none;
    overflow: visible;
  }

  .side-rail--left {
    /* コンテンツ左端の外側に配置: 50vw - (コンテンツ幅/2) - 広告幅 - gap */
    left: calc(50vw - 600px - 160px - 8px);
  }

  .side-rail--right {
    right: calc(50vw - 600px - 160px - 8px);
  }

  /* 1540px以上（コンテンツ1200px + 左右160px×2 + 余裕）で表示 */
  @media (min-width: 1540px) {
    .side-rail {
      display: block;
    }
  }
</style>
