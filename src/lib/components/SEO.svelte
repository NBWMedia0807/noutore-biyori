<script>
  import { page } from '$app/stores';
  import { SITE } from '$lib/config/site.js';

  export let title = '';
  export let description = '';
  export let image = '';
  export let noindex = false;
  export let canonical = '';

  const SITE_URL = 'https://noutorebiyori.com';

  const finalTitle = title ? `${title} | ${SITE.name}` : `${SITE.tagline} | ${SITE.name}`;
  const finalDescription = description || SITE.description;
  const finalImage = image || SITE.defaultOgImage;
  const finalUrl = canonical || `${SITE_URL}${$page.url.pathname}`;
</script>

<svelte:head>
  <title>{finalTitle}</title>
  <meta name="description" content={finalDescription} />
  <link rel="canonical" href={finalUrl} />

  {#if noindex}
    <meta name="robots" content="noindex, nofollow" />
  {/if}

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content={finalUrl} />
  <meta property="og:title" content={finalTitle} />
  <meta property="og:description" content={finalDescription} />
  <meta property="og:image" content={finalImage} />
  <meta property="og:site_name" content={SITE.name} />
  <meta property="og:locale" content={SITE.locale} />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={finalTitle} />
  <meta name="twitter:description" content={finalDescription} />
  <meta name="twitter:image" content={finalImage} />
  {#if SITE.twitterHandle}
    <meta name="twitter:site" content={SITE.twitterHandle} />
  {/if}
</svelte:head>