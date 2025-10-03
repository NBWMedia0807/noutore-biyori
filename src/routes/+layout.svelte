<script>
  import '../lib/styles/global.css';
  import { page } from '$app/stores';
  import { SITE } from '$lib/config/site.js';
  import { createPageSeo } from '$lib/seo.js';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';

  export let data;

  const twitterHandle = SITE.twitterHandle ?? '';

  $: currentPage = $page;
  $: ui = currentPage?.data?.ui ?? {};
  $: breadcrumbs = Array.isArray(currentPage?.data?.breadcrumbs)
    ? currentPage.data.breadcrumbs
    : [];
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
  const footerLinks = [
    { href: '/privacy', label: 'プライバシーポリシー' },
    { href: '/disclaimer', label: '免責事項' },
    { href: '/contact', label: 'お問い合わせ' },
    { href: '/about', label: 'サイトについて' },
    { href: '/about#author-info', label: '著者情報' },
    { href: '/about#operator-info', label: '運営者情報' }
  ];
  const foundationYear = 2025;
  const currentYear = new Date().getFullYear();
  const copyrightYear =
    currentYear <= foundationYear ? `${foundationYear}年` : `${foundationYear}年〜${currentYear}年`;
</script>

<svelte:head>
  <title>{seo.title}</title>
  <link rel="preconnect" href="https://cdn.sanity.io" crossorigin />
  <link rel="preload" href="/logo.svg" as="image" type="image/svg+xml" />
  {#if seo.description}
    <meta name="description" content={seo.description} />
  {/if}
  <meta name="robots" content="max-image-preview:large" />
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
  <header class="site-header">
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

<footer class="site-footer">
  <div class="footer-inner">
    <nav class="footer-nav" aria-label="フッターナビゲーション">
      <ul class="footer-links">
        {#each footerLinks as link (link.href)}
          <li>
            <a href={link.href}>{link.label}</a>
          </li>
        {/each}
      </ul>
    </nav>
    <p class="footer-copy">&copy; {copyrightYear} 脳トレ日和 — 毎日の脳トレで健康な生活を</p>
  </div>
</footer>
