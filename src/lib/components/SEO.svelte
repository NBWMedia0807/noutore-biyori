<script>
  import { page } from '$app/stores';
  import { SITE as RAW_SITE } from '$lib/config/site.js';

  const DEFAULT_SITE = {
    name: '脳トレ日和',
    description: '',
    url: 'https://noutorebiyori.com',
    language: 'ja',
    locale: 'ja_JP',
    defaultOgImage: 'https://noutorebiyori.com/logo.svg',
    twitterHandle: '',
    keywords: []
  };

  const SITE = (() => {
    try {
      return { ...DEFAULT_SITE, ...(RAW_SITE ?? {}) };
    } catch (error) {
      console.error('[SEO] Failed to load site config:', error);
      return DEFAULT_SITE;
    }
  })();

  /** @type {string} */
  export let title = '';
  /** @type {string} */
  export let description = '';
  /** @type {string} */
  export let image = '';
  /** @type {number | undefined} */
  export let imageWidth;
  /** @type {number | undefined} */
  export let imageHeight;
  /** @type {string} */
  export let imageAlt = '';
  /** @type {string} */
  export let type = 'website';
  /** @type {boolean} */
  export let noindex = false;
  /** @type {string} */
  export let canonical = '';
  /** @type {any[] | object} */
  export let jsonld = [];
  /** @type {object | null} */
  export let article = null;

  const toSafeString = (value, fallback = '') => (typeof value === 'string' ? value : fallback);

  const toAbsoluteUrl = (value) => {
    if (!value) return SITE.url;
    try {
      return new URL(value, SITE.url).href;
    } catch (error) {
      console.error('[SEO] Failed to resolve URL:', error);
      return SITE.url;
    }
  };

  const toIsoString = (value) => {
    if (!value) return '';
    try {
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return date.toISOString();
    } catch (error) {
      console.error('[SEO] Failed to normalize date:', error);
      return '';
    }
  };

  $: currentPath = $page?.url?.pathname ?? '/';
  $: canonicalUrl = canonical ? toAbsoluteUrl(canonical) : toAbsoluteUrl(currentPath);

  $: titleText = toSafeString(title) || toSafeString(SITE.name);
  $: descriptionText = toSafeString(description) || toSafeString(SITE.description);
  $: imageUrl = image
    ? toAbsoluteUrl(image)
    : toAbsoluteUrl(toSafeString(SITE.defaultOgImage, '/logo.svg'));
  $: locale = toSafeString(SITE.locale) || 'ja_JP';
  $: siteName = toSafeString(SITE.name) || 'サイト';
  $: siteKeywords = Array.isArray(SITE.keywords)
    ? SITE.keywords.map((k) => toSafeString(k)).filter(Boolean)
    : [];
  $: twitterHandle = toSafeString(SITE.twitterHandle);
  $: jsonLdList = Array.isArray(jsonld) ? jsonld.filter(Boolean) : jsonld ? [jsonld] : [];
  $: jsonLdStrings = jsonLdList
    .map((schema) => {
      try {
        return JSON.stringify(schema);
      } catch (error) {
        console.error('[SEO] Failed to serialize JSON-LD:', error);
        return null;
      }
    })
    .filter(Boolean);

  $: articlePublished = toIsoString(article?.publishedTime);
  $: articleModified = toIsoString(article?.modifiedTime);
  $: articleAuthor = toSafeString(article?.author);
  $: articleSection = toSafeString(article?.section);
</script>

<svelte:head>
  <title>{titleText}</title>
  {#if descriptionText}
    <meta name="description" content={descriptionText} />
  {/if}
  {#if siteKeywords.length}
    <meta name="keywords" content={siteKeywords.join(', ')} />
  {/if}
  <link rel="canonical" href={canonicalUrl} />

  {#if noindex}
    <meta name="robots" content="noindex,nofollow" />
  {:else}
    <meta name="robots" content="index,follow" />
  {/if}

  <meta property="og:type" content={type || 'website'} />
  <meta property="og:site_name" content={siteName} />
  <meta property="og:locale" content={locale} />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:title" content={titleText} />
  {#if descriptionText}
    <meta property="og:description" content={descriptionText} />
  {/if}
  {#if imageUrl}
    <meta property="og:image" content={imageUrl} />
    {#if imageWidth}
      <meta property="og:image:width" content={imageWidth} />
    {/if}
    {#if imageHeight}
      <meta property="og:image:height" content={imageHeight} />
    {/if}
    {#if imageAlt}
      <meta property="og:image:alt" content={imageAlt} />
    {/if}
  {/if}

  {#if articlePublished}
    <meta property="article:published_time" content={articlePublished} />
  {/if}
  {#if articleModified}
    <meta property="article:modified_time" content={articleModified} />
  {/if}
  {#if articleAuthor}
    <meta property="article:author" content={articleAuthor} />
  {/if}
  {#if articleSection}
    <meta property="article:section" content={articleSection} />
  {/if}

  <meta name="twitter:card" content="summary_large_image" />
  {#if twitterHandle}
    <meta name="twitter:site" content={twitterHandle} />
    <meta name="twitter:creator" content={twitterHandle} />
  {/if}
  <meta name="twitter:title" content={titleText} />
  {#if descriptionText}
    <meta name="twitter:description" content={descriptionText} />
  {/if}
  {#if imageUrl}
    <meta name="twitter:image" content={imageUrl} />
    {#if imageAlt}
      <meta name="twitter:image:alt" content={imageAlt} />
    {/if}
  {/if}

  {#each jsonLdStrings as schema, index}
    <script type="application/ld+json" id={`ld-json-${index}`}>
      {@html schema}
    </script>
  {/each}
</svelte:head>
