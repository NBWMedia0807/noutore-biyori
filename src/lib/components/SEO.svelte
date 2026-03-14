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
  /** @type {number|undefined} */
  export let imageWidth = undefined;
  /** @type {number|undefined} */
  export let imageHeight = undefined;
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
            // サイト内検索のPotentialAction（Googleのサイト内検索リッチリザルト対応）
            potentialAction: {
              '@type': 'SearchAction',
              target: {
                '@type': 'EntryPoint',
                urlTemplate: `${SITE_URL}/quiz?q={search_term_string}`
              },
              'query-input': 'required name=search_term_string'
            }
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
            sameAs: [
              'https://x.com/noutorebiyori'
            ]
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

  <!-- テーマカラー（ブラウザのアドレスバー・PWA対応） -->
  <meta name="theme-color" content="#ffc107" />

  <!-- robots: インデックス対象ページはリッチスニペット最大化のオプションを追加 -->
  {#if noindex}
    <meta name="robots" content="noindex,nofollow" />
  {:else}
    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
  {/if}

  <!-- OGP -->
  <meta property="og:type" content={type} />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:title" content={titleText} />
  <meta property="og:description" content={descriptionText} />
  <meta property="og:image" content={imageUrl} />
  {#if imageWidth}
    <meta property="og:image:width" content={String(imageWidth)} />
  {/if}
  {#if imageHeight}
    <meta property="og:image:height" content={String(imageHeight)} />
  {/if}
  <meta property="og:image:alt" content={titleText} />
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

  <!-- RSS フィード（Chrome の Discover フォロー機能の技術基盤） -->
  <link rel="alternate" type="application/rss+xml" title="脳トレ日和" href="/rss/merkystyle.xml" />

  <!-- X (Twitter) Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@noutorebiyori" />
  <meta name="twitter:creator" content="@noutorebiyori" />
  <meta name="twitter:title" content={titleText} />
  <meta name="twitter:description" content={descriptionText} />
  <meta name="twitter:image" content={imageUrl} />
  <meta name="twitter:image:alt" content={titleText} />

  {#if jsonldScript}
    {@html `<script type="application/ld+json">${jsonldScript}</script>`}
  {/if}
</svelte:head>
