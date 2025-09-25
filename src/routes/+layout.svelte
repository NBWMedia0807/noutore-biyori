<script>
  import '../lib/styles/global.css';
  import { page } from '$app/stores';
  import { SITE } from '$lib/config/site.js';
  import { createPageSeo } from '$lib/seo.js';

  export let data;

  const twitterHandle = SITE.twitterHandle ?? '';

  $: currentPage = $page;
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
</script>

<svelte:head>
  <title>{seo.title}</title>
  <link rel="preconnect" href="https://cdn.sanity.io" crossorigin />
  <link rel="preload" href="/logo.png" as="image" type="image/png" />
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

<header>
  <div class="header-content">
    <a href="/" class="logo-section" aria-label="脳トレ日和 トップページ">
      <img
        src="/logo.png"
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

<nav class="main-nav">
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

<main>
  <slot />
</main>

<footer>
  <div class="footer-content">
    <p>&copy; 2025年9月 脳トレ日和 - 毎日の脳トレで健康な生活を</p>
    <div class="footer-links">
      <a href="/privacy">プライバシーポリシー</a>
      <a href="/disclaimer">免責事項</a>
      <a href="/contact">お問い合わせ</a>
      <a href="/about">サイトについて</a>
      <a href="/about#author-info">著者情報</a>
      <a href="/about#operator-info">運営者情報</a>
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
