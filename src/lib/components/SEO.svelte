<script>
  import { page } from '$app/stores';

  const SITE_TITLE = '脳トレ日和';
  const SITE_DESCRIPTION = '楽しく脳を鍛えましょう';
  const SITE_URL = 'https://noutorebiyori.com';

  /** @type {string} */
  export let title = '';
  /** @type {string} */
  export let description = '';
  /** @type {string} */
  export let image = '';
  /** @type {boolean} */
  export let noindex = false;
  /** @type {string} */
  export let canonical = '';
  /** @type {string} og:type (website or article) */
  export let type = 'website';
  /** @type {Array|null} JSON-LD structured data array */
  export let jsonld = null;
  /** @type {object|null} article meta data */
  export let article = null;

  $: currentPath = $page.url ? $page.url.pathname : '';
  $: canonicalUrl = canonical || SITE_URL + currentPath;

  $: titleText = title ? `${title} | ${SITE_TITLE}` : SITE_TITLE;
  $: descriptionText = description || SITE_DESCRIPTION;
  $: imageUrl = image || `${SITE_URL}/logo.svg`;

  $: typeText = type === 'article' ? 'Article' : 'WebSite';

  // JSON-LD を安全にシリアライズし、よりリッチな基本構造を付与
  $: jsonldScript = (() => {
    try {
      const baseGraph = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': `${SITE_URL}/#website`,
            url: SITE_URL,
            name: SITE_TITLE,
            description: SITE_DESCRIPTION,
            publisher: {
              '@id': `${SITE_URL}/#organization`,
            },
            inLanguage: 'ja',
          },
          {
            '@type': 'Organization',
            '@id': `${SITE_URL}/#organization`,
            name: SITE_TITLE,
            url: SITE_URL,
            logo: {
              '@type': 'ImageObject',
              url: `${SITE_URL}/logo.svg`,
              width: 512,
              height: 512,
            },
          },
        ],
      };

      if (jsonld && Array.isArray(jsonld)) {
        baseGraph['@graph'].push(...jsonld);
      }

      return JSON.stringify(baseGraph);
    } catch {
      return '';
    }
  })();
</script>

<svelte:head>
  <title>{titleText}</title>
  <meta name="description" content={descriptionText} />
  <link rel="canonical" href={canonicalUrl} />

  {#if noindex}
    <meta name="robots" content="noindex,nofollow" />
  {:else}
    <meta name="robots" content="index,follow" />
  {/if}

  <meta property="og:type" content={type} />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:title" content={titleText} />
  <meta property="og:description" content={descriptionText} />
  <meta property="og:image" content={imageUrl} />
  <meta property="og:site_name" content={SITE_TITLE} />
  <meta property="og:locale" content="ja_JP" />

  {#if type === 'article' && article}
    {#if article.publishedTime}
      <meta property="article:published_time" content={article.publishedTime} />
    {/if}
    {#if article.modifiedTime}
      <meta property="article:modified_time" content={article.modifiedTime} />
    {/if}
    {#if article.author}
      <meta property="article:author" content={article.author} />
    {/if}
    {#if article.section}
      <meta property="article:section" content={article.section} />
    {/if}
  {/if}

  <!-- X (Twitter) Card Improvements -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@noutore_biyori" />
  <meta name="twitter:creator" content="@noutore_biyori" />
  <meta name="twitter:title" content={titleText} />
  <meta name="twitter:description" content={descriptionText} />
  <meta name="twitter:image" content={imageUrl} />

  {#if jsonldScript}
    {@html `<script type="application/ld+json">${jsonldScript}</script>`}
  {/if}
</svelte:head>
