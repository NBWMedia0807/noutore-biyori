<script>
  import '../lib/styles/global.css';
  import { page } from '$app/stores';
  import { SITE } from '$lib/config/site.js';
  import { createPageSeo } from '$lib/seo.js';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import { onMount } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import { loadGtagOnce, sendPageView } from '$lib/ga';

  export let data;

  const twitterHandle = SITE.twitterHandle ?? '';
  const gaMeasurementId = import.meta.env.VITE_GA_ID;

  $: currentPage = $page;
  $: ui = currentPage?.data?.ui ?? {};
  $: breadcrumbs = Array.isArray(currentPage?.data?.breadcrumbs)
    ? currentPage.data.breadcrumbs
    : [];
  $: reviewMode = Boolean(data?.flags?.adsenseReviewMode);
  $: hasQuery = Boolean(currentPage?.url?.search && currentPage.url.search.length > 0);
  let shouldSkipNextPageView = true;
  $: fallbackSeo = createPageSeo({
    path: currentPage?.url?.pathname ?? '/',
    appendSiteName: false
  });
  $: providedSeo = currentPage?.data?.seo ?? {};
  $: resolvedJsonLd = (() => {
    if (!providedSeo?.jsonld) return fallbackSeo.jsonld;
    return Array.isArray(providedSeo.jsonld)
      ? providedSeo.jsonld.filter(Boolean)
      : [providedSeo.jsonld];
  })();
  $: seo = {
    ...fallbackSeo,
    ...providedSeo,
    description: providedSeo.description ?? fallbackSeo.description,
    canonical: providedSeo.canonical ?? fallbackSeo.canonical,
    image: providedSeo.image ?? fallbackSeo.image,
    type: providedSeo.type ?? fallbackSeo.type,
    jsonld: resolvedJsonLd
  };
  $: imageAlt = providedSeo.imageAlt ?? `${SITE.name}のイメージ`;
  $: robotsContent = hasQuery ? 'noindex, follow' : 'max-image-preview:large';
  $: if (typeof document !== 'undefined') {
    document.documentElement.dataset.reviewMode = reviewMode ? 'true' : 'false';
    document.body.dataset.reviewMode = reviewMode ? 'true' : 'false';
  }

  onMount(() => {
    loadGtagOnce();

    if (typeof window !== 'undefined') {
      sendPageView(`${window.location.pathname}${window.location.search}`);
    }

    afterNavigate((navigation) => {
      if (shouldSkipNextPageView) {
        shouldSkipNextPageView = false;
        return;
      }

      const path = navigation?.to?.url?.pathname ?? window.location.pathname;
      const search = navigation?.to?.url?.search ?? window.location.search;
      sendPageView(`${path}${search}`);
    });
  });
</script>

<svelte:head>
  <title>{seo.title}</title>
  <link rel="preconnect" href="https://cdn.sanity.io" crossorigin />
  <link rel="preload" href="/logo.svg" as="image" type="image/svg+xml" />
  {#if seo.description}
    <meta name="description" content={seo.description} />
  {/if}
  <meta name="robots" content={robotsContent} />
  {#if seo.canonical}
    <link rel="canonical" href={seo.canonical} />
  {/if}
  <meta property="og:site_name" content={SITE.name} />
  <meta property="og:title" content={seo.title} />
  {#if seo.description}
    <meta property="og:description" content={seo.description} />
  {/if}
  {#if seo.canonical}
    <meta property="og:url" content={seo.canonical} />
  {/if}
  <meta property="og:type" content={seo.type ?? 'website'} />
  {#if seo.image}
    <meta property="og:image" content={seo.image} />
  {/if}
  {#if seo.image && seo.imageWidth}
    <meta property="og:image:width" content={seo.imageWidth} />
  {/if}
  {#if seo.image && seo.imageHeight}
    <meta property="og:image:height" content={seo.imageHeight} />
  {/if}
  <meta property="og:locale" content={SITE.locale} />
  {#if seo.image}
    <meta property="og:image:alt" content={imageAlt} />
  {/if}
  {#if seo.article?.author}
    <meta name="author" content={seo.article.author} />
  {/if}
  {#if seo.article?.section}
    <meta property="article:section" content={seo.article.section} />
  {/if}
  {#if seo.article?.publishedTime}
    <meta property="article:published_time" content={seo.article.publishedTime} />
  {/if}
  {#if seo.article?.modifiedTime}
    <meta property="article:modified_time" content={seo.article.modifiedTime} />
    <meta property="og:updated_time" content={seo.article.modifiedTime} />
  {/if}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={seo.title} />
  {#if seo.description}
    <meta name="twitter:description" content={seo.description} />
  {/if}
  {#if gaMeasurementId}
    <script
      id="ga4-gtag-script"
      async
      src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
      data-measurement-id={gaMeasurementId}
    ></script>
    <script id="ga4-gtag-inline" data-measurement-id={gaMeasurementId}>
      (function () {
        const measurementId = document.currentScript?.dataset.measurementId;
        if (!measurementId) return;
        window.dataLayer = window.dataLayer || [];
        function gtag() {
          window.dataLayer.push(arguments);
        }
        window.gtag = window.gtag || gtag;
        window.gtag('js', new Date());
        window.gtag('config', measurementId, { send_page_view: false });
      })();
    </script>
  {/if}
  {#if seo.image}
    <meta name="twitter:image" content={seo.image} />
    <meta name="twitter:image:alt" content={imageAlt} />
  {/if}
  {#if twitterHandle}
    <meta name="twitter:site" content={twitterHandle} />
    <meta name="twitter:creator" content={twitterHandle} />
  {/if}
  {#each seo.jsonld as schema (schema['@id'] ?? JSON.stringify(schema))}
    <script type="application/ld+json">{JSON.stringify(schema)}</script>
  {/each}
</svelte:head>

{#if ui.showHeader !== false}
  <header class="site-header" data-review-mode={reviewMode}>
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
          <p class="subtitle">楽しく脳を鍛えましょう</p>
        </div>
      </a>
    </div>
  </header>
{/if}

{#if !ui.hideGlobalNavTabs}
  <nav class="main-nav global-nav">
    <div class="nav-container">
      <ul class="nav-menu">
        {#if data?.categories?.length}
          {#each data.categories as c}
            <li>
              <a href={`/category/${c.slug}`} class="nav-link" data-sveltekit-preload-data>{c.title}</a>
            </li>
          {/each}
        {/if}
      </ul>
    </div>
  </nav>
{/if}

{#if !ui.hideBreadcrumbs && breadcrumbs.length}
  <div class="breadcrumbs-container">
    <Breadcrumbs items={breadcrumbs} />
  </div>
{/if}

<main>
  <slot />
</main>

<footer data-review-mode={reviewMode}>
  <div class="footer-content">
    <p class="footer-copy">
      <span class="footer-copy-line">&copy; 2025年9月 脳トレ日和</span>
      <span class="footer-copy-line">毎日の脳トレで健康な生活を</span>
    </p>
    <nav aria-label="固定ページリンク">
      <ul class="footer-links">
        <li><a href="/privacy">プライバシーポリシー</a></li>
        <li><a href="/terms">利用規約</a></li>
        <li><a href="/disclaimer">免責事項</a></li>
        <li><a href="/contact">お問い合わせ</a></li>
        <li><a href="/about">サイトについて</a></li>
        <li><a href="/about#author-info">著者情報</a></li>
        <li><a href="/about#operator-info">運営者情報</a></li>
      </ul>
    </nav>
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

  .main-nav {
    border-bottom: 1px solid rgba(15, 23, 42, 0.08);
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(6px);
  }

  .nav-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .nav-menu {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    padding: 0.75rem 0;
    margin: 0;
    justify-content: center;
  }

  .nav-link {
    padding: 0.5rem 1rem;
    border-radius: 999px;
    text-decoration: none;
    color: inherit;
    font-weight: 600;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .nav-link:hover,
  .nav-link:focus-visible {
    background: rgba(250, 204, 21, 0.2);
    outline: none;
  }

  .breadcrumbs-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  footer {
    background: #faf8f4;
    border-top: 1px solid rgba(15, 23, 42, 0.08);
  }

  .footer-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2.5rem 1rem;
    display: grid;
    gap: 1.5rem;
  }

  .footer-copy {
    margin: 0;
    text-align: center;
    color: #4b5563;
    font-size: 0.95rem;
    line-height: 1.6;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .footer-copy-line {
    display: block;
  }


  .footer-links {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.75rem;
    max-width: 280px;
    margin-inline: auto;
  }

  .footer-links a {
    text-decoration: none;
    color: #1f2937;
    font-weight: 600;
    padding: 0.75rem 1rem;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
    display: block;
    text-align: center;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .footer-links a:hover,
  .footer-links a:focus-visible {
    background: rgba(250, 204, 21, 0.2);
    outline: none;
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

    .footer-content {
      padding: 2rem 1.5rem 2.5rem;
    }

  }
</style>
