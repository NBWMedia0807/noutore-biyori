<script>
  import { page } from '$app/stores';
  import { SITE } from '$lib/config/site.js';
  import { SvelteMeta, OpenGraph } from 'svelte-meta-tags';

  /** @type {string} */
  export let title = `${SITE.name}｜${SITE.tagline}`;
  /** @type {string | undefined} */
  export let description = SITE.description;
  /** @type {string | undefined} */
  export let canonical = SITE.url;
  /** @type {boolean} */
  export let noindex = false;
  /** @type {string | undefined} */
  export let image = SITE.defaultOgImage;
  /** @type {number | undefined} */
  export let imageWidth = undefined;
  /** @type {number | undefined} */
  export let imageHeight = undefined;
  /** @type {string | undefined} */
  export let imageAlt = undefined;
  /** @type {'website' | 'article' | 'profile' | undefined} */
  export let type = 'website';
  /** @type {any | undefined} */
  export let article = undefined;
  /** @type {any[]} */
  export let jsonld = [];

  const twitterHandle = SITE.twitterHandle ?? '';

  $: finalRobotsContent = noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large';
  $: finalImageAlt = imageAlt ?? `${SITE.name}のイメージ`;
</script>

<SvelteMeta
  title={title}
  description={description}
  canonical={canonical}
  keywords={SITE.keywords.join(',')}
  openGraph={{
    title: title,
    description: description,
    url: canonical,
    type: type,
    images: image
      ? [
          {
            url: image,
            width: imageWidth,
            height: imageHeight,
            alt: finalImageAlt
          }
        ]
      : [],
    siteName: SITE.name,
    locale: SITE.locale,
    article: article
      ? {
          publishedTime: article.publishedTime,
          modifiedTime: article.modifiedTime,
          authors: [article.author],
          section: article.section
        }
      : undefined
  }}
  twitter={{
    cardType: 'summary_large_image',
    title: title,
    description: description,
    image: image,
    imageAlt: finalImageAlt,
    site: twitterHandle,
    creator: twitterHandle
  }}
  additionalMetaTags={[{ name: 'robots', content: finalRobotsContent }]}
/>

{#if article?.publishedTime}
  <meta property="og:updated_time" content={article.modifiedTime ?? article.publishedTime} />
{/if}

{#each jsonld as schema (schema['@id'] ?? JSON.stringify(schema))}
  <script type="application/ld+json">{JSON.stringify(schema, null, 2)}</script>
{/each}
